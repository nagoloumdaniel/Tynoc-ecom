import { NotFoundError } from "@/lib/errors";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, RELATED_PRODUCTS_COUNT } from "@/lib/limits";
import type { Category, CategoryWithCount } from "@/schemas/category";
import type { Product, ProductSort } from "@/schemas/product";

/**
 * Logique métier du catalogue (P4.6 et P4.7).
 *
 * Recherche, filtres, tri et produits associés vivent **ici** et nulle part
 * ailleurs. DynamoDB ne sait pas faire de recherche plein texte ; la stratégie
 * retenue est de charger le catalogue borné par une seule `Query` puis de
 * filtrer en mémoire. Le choix est assumé et documenté, avec sa limite, dans
 * `docs/DATA-MODEL.md` § 8 : au-delà de quelques milliers de produits, il
 * faudrait un moteur d'indexation.
 *
 * Principe transverse de cette couche : **un paramètre invalide ne casse
 * rien**. Une borne de prix inversée se remet à l'endroit, un tri inconnu
 * retombe sur le tri par défaut, une page négative devient la première. Ces
 * valeurs viennent d'une URL, donc de n'importe qui.
 */

interface ProductReader {
  findAll(): Promise<Product[]>;
  findBySlug(slug: string): Promise<Product | null>;
  findByCategory(categorySlug: string): Promise<Product[]>;
}

interface CategoryReader {
  findAll(): Promise<Category[]>;
  findBySlug(slug: string): Promise<Category | null>;
}

export interface ProductQuery {
  q?: string;
  category?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  inStockOnly?: boolean;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

export interface ProductSearchResult {
  items: Product[];
  /** Nombre d'éléments après filtrage, avant découpage en pages. */
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

const SORTS: ProductSort[] = ["newest", "price-asc", "price-desc", "name"];

/**
 * Normalise un texte pour la comparaison : minuscules, sans accent, sans
 * espaces superflus.
 *
 * Sans cela, « cardioide » ne trouverait pas « cardioïde », ce qui est
 * exactement ce que tape quelqu'un de pressé.
 */
function normalize(value: string): string {
  // `\p{Diacritic}` plutôt qu'une plage d'échappements Unicode : le formateur
  // réécrit une plage en caractères combinants littéraux, invisibles dans un
  // éditeur et impossibles à relire en revue.
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Champs sur lesquels porte la recherche, du plus au moins déterminant. */
function searchableText(product: Product): string {
  return normalize(
    [product.title, product.brand, product.summary, ...product.tags, product.categorySlug].join(
      " ",
    ),
  );
}

function compare(sort: ProductSort): (left: Product, right: Product) => number {
  switch (sort) {
    case "price-asc":
      return (left, right) => left.priceCents - right.priceCents;
    case "price-desc":
      return (left, right) => right.priceCents - left.priceCents;
    case "name":
      return (left, right) => left.title.localeCompare(right.title, "fr");
    case "newest":
    default:
      return (left, right) => right.createdAt.localeCompare(left.createdAt);
  }
}

export function createProductService(deps: {
  productRepository: ProductReader;
  categoryRepository: CategoryReader;
}) {
  const { productRepository: products, categoryRepository: categories } = deps;

  return {
    async search(query: ProductQuery): Promise<ProductSearchResult> {
      // Une seule lecture, quels que soient les filtres : les combiner côté
      // base demanderait un index par combinaison.
      const all = query.category
        ? await products.findByCategory(query.category)
        : await products.findAll();

      const needle = query.q ? normalize(query.q) : "";

      // Deux traitements distincts, et il faut les deux.
      //
      // D'abord écarter ce qui n'est pas un nombre exploitable : `?min=1e999`
      // vaut Infinity après conversion, et utilisé tel quel il vide le
      // catalogue en silence. Ensuite seulement remettre les bornes dans
      // l'ordre, pour qu'un formulaire mal rempli ne produise pas un
      // cul-de-sac.
      const usable = (value: number | undefined): number | undefined =>
        typeof value === "number" && Number.isFinite(value) ? value : undefined;

      const lowerInput = usable(query.minPriceCents);
      const upperInput = usable(query.maxPriceCents);

      const minPrice =
        lowerInput !== undefined && upperInput !== undefined
          ? Math.min(lowerInput, upperInput)
          : lowerInput;
      const maxPrice =
        lowerInput !== undefined && upperInput !== undefined
          ? Math.max(lowerInput, upperInput)
          : upperInput;

      const filtered = all.filter((product) => {
        if (needle && !searchableText(product).includes(needle)) return false;
        if (minPrice !== undefined && product.priceCents < minPrice) return false;
        if (maxPrice !== undefined && product.priceCents > maxPrice) return false;
        if (query.inStockOnly === true && product.stock <= 0) return false;
        return true;
      });

      const sort = query.sort && SORTS.includes(query.sort) ? query.sort : "newest";
      filtered.sort(compare(sort));

      const pageSize = Math.min(
        Math.max(Math.trunc(query.pageSize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE, 1),
        MAX_PAGE_SIZE,
      );
      const page = Math.max(Math.trunc(query.page ?? 1) || 1, 1);
      const start = (page - 1) * pageSize;

      return {
        items: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        pageSize,
        pageCount: Math.max(Math.ceil(filtered.length / pageSize), 1),
      };
    },

    /**
     * Lecture d'une fiche produit.
     *
     * C'est ici que l'absence devient une erreur, et pas dans le repository :
     * la page produit veut un 404, le panier veut une ligne orpheline. La même
     * absence n'a pas la même conséquence selon l'appelant.
     */
    async getBySlug(slug: string): Promise<Product> {
      const product = await products.findBySlug(slug);

      if (!product) {
        throw new NotFoundError("Ce produit n'existe pas ou n'est plus au catalogue.");
      }

      return product;
    },

    /**
     * Produits associés (P4.7).
     *
     * Même catégorie, produit courant exclu, et classement par nombre de tags
     * partagés. Le départage se fait ensuite sur la nouveauté puis sur
     * l'identifiant : l'ordre est donc **déterministe**, ce qui rend la page
     * produit stable d'un rendu à l'autre et le résultat testable.
     */
    async findRelated(current: Product, limit = RELATED_PRODUCTS_COUNT): Promise<Product[]> {
      const sameCategory = await products.findByCategory(current.categorySlug);
      const currentTags = new Set(current.tags);

      return sameCategory
        .filter((product) => product.id !== current.id)
        .map((product) => ({
          product,
          shared: product.tags.filter((tag) => currentTags.has(tag)).length,
        }))
        .sort(
          (left, right) =>
            right.shared - left.shared ||
            right.product.createdAt.localeCompare(left.product.createdAt) ||
            left.product.id.localeCompare(right.product.id),
        )
        .slice(0, limit)
        .map((entry) => entry.product);
    },

    /** Catégories enrichies du nombre de produits, pour les pages d'index. */
    async listCategories(): Promise<CategoryWithCount[]> {
      const [all, catalogue] = await Promise.all([categories.findAll(), products.findAll()]);

      const counts = new Map<string, number>();
      for (const product of catalogue) {
        counts.set(product.categorySlug, (counts.get(product.categorySlug) ?? 0) + 1);
      }

      return all.map((category) => ({
        ...category,
        productCount: counts.get(category.slug) ?? 0,
      }));
    },

    async getCategoryBySlug(slug: string): Promise<Category> {
      const category = await categories.findBySlug(slug);

      if (!category) {
        throw new NotFoundError("Cette catégorie n'existe pas.");
      }

      return category;
    },
  };
}

export type ProductService = ReturnType<typeof createProductService>;
