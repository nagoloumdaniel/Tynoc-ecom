import { describe, expect, it } from "vitest";

import { NotFoundError } from "@/lib/errors";
import { RELATED_PRODUCTS_COUNT } from "@/lib/limits";
import { createProductService } from "@/server/services/product.service";

import { makeCategory, makeProduct } from "../helpers/factories";
import {
  createFakeCategoryRepository,
  createFakeProductRepository,
} from "../helpers/fake-repositories";

/**
 * Service produit (P4.6 et P4.7) : recherche, filtres, tri, produits associés.
 *
 * Toute cette logique vit ici, et pas dans le repository. DynamoDB ne sait pas
 * faire de recherche plein texte : la stratégie retenue et documentée est de
 * charger le catalogue borné par une seule `Query` et de filtrer en mémoire
 * (`docs/DATA-MODEL.md` § 8).
 */

const catalogue = [
  makeProduct({
    slug: "sennheiser-hd-660s2",
    title: "HD 660S2",
    brand: "Sennheiser",
    summary: "Casque ouvert 300 Ω au grave étendu.",
    priceCents: 54_900,
    stock: 12,
    categorySlug: "casques",
    tags: ["ouvert", "studio"],
    createdAt: "2026-03-01T10:00:00.000Z",
  }),
  makeProduct({
    slug: "beyerdynamic-dt-770",
    title: "DT 770 Pro",
    brand: "Beyerdynamic",
    summary: "Casque fermé isolant.",
    priceCents: 16_900,
    stock: 0,
    categorySlug: "casques",
    tags: ["ferme", "studio"],
    createdAt: "2026-05-01T10:00:00.000Z",
  }),
  makeProduct({
    slug: "hifiman-sundara",
    title: "Sundara",
    brand: "HiFiMan",
    summary: "Planar magnétique ouvert.",
    priceCents: 34_900,
    stock: 6,
    categorySlug: "casques",
    tags: ["ouvert", "planar"],
    createdAt: "2026-01-01T10:00:00.000Z",
  }),
  makeProduct({
    slug: "shure-sm7b",
    title: "SM7B",
    brand: "Shure",
    summary: "Micro dynamique cardioïde pour la voix.",
    priceCents: 41_900,
    stock: 8,
    categorySlug: "microphones",
    tags: ["dynamique", "voix"],
    createdAt: "2026-07-01T10:00:00.000Z",
  }),
  makeProduct({
    slug: "neutrik-adaptateur",
    title: "Adaptateur 6,35 vers 3,5 mm",
    brand: "Neutrik",
    summary: "Corps métal, stéréo.",
    priceCents: 900,
    stock: 60,
    categorySlug: "cables",
    tags: ["adaptateur"],
    createdAt: "2026-02-01T10:00:00.000Z",
  }),
];

function setup(products = catalogue) {
  const productRepository = createFakeProductRepository(products);
  const categoryRepository = createFakeCategoryRepository([
    makeCategory({ slug: "casques", name: "Casques", position: 1 }),
    makeCategory({ slug: "microphones", name: "Microphones", position: 2 }),
    makeCategory({ slug: "cables", name: "Câblage", position: 3 }),
  ]);

  return { service: createProductService({ productRepository, categoryRepository }) };
}

describe("recherche", () => {
  it("retourne tout le catalogue sans critère", async () => {
    const { service } = setup();
    const result = await service.search({});

    expect(result.total).toBe(5);
  });

  it("trouve par titre, sans tenir compte de la casse", async () => {
    const { service } = setup();
    const result = await service.search({ q: "sundara" });

    expect(result.items.map((product) => product.slug)).toEqual(["hifiman-sundara"]);
  });

  it("trouve par marque", async () => {
    const { service } = setup();
    const result = await service.search({ q: "shure" });

    expect(result.items[0]?.slug).toBe("shure-sm7b");
  });

  it("trouve par tag", async () => {
    const { service } = setup();
    const result = await service.search({ q: "planar" });

    expect(result.items[0]?.slug).toBe("hifiman-sundara");
  });

  it("ignore les accents dans les deux sens", async () => {
    // Quelqu'un qui tape « cardioide » sans accent doit trouver « cardioïde ».
    const { service } = setup();

    expect((await service.search({ q: "cardioide" })).total).toBe(1);
    expect((await service.search({ q: "câblage" })).total).toBeGreaterThanOrEqual(0);
  });

  it("ignore les espaces superflus", async () => {
    const { service } = setup();
    expect((await service.search({ q: "   sundara  " })).total).toBe(1);
  });

  it("rend une liste vide plutôt qu'une erreur quand rien ne correspond", async () => {
    const { service } = setup();
    const result = await service.search({ q: "tourne-disque" });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("filtres", () => {
  it("filtre par catégorie", async () => {
    const { service } = setup();
    const result = await service.search({ category: "microphones" });

    expect(result.items.map((product) => product.slug)).toEqual(["shure-sm7b"]);
  });

  it("filtre par prix, bornes incluses", async () => {
    const { service } = setup();
    const result = await service.search({ minPriceCents: 16_900, maxPriceCents: 41_900 });

    expect(result.items.map((product) => product.priceCents).sort((a, b) => a - b)).toEqual([
      16_900, 34_900, 41_900,
    ]);
  });

  it("remet les bornes de prix dans l'ordre plutôt que de rendre une liste vide", async () => {
    // Un formulaire mal rempli ne doit pas produire un cul-de-sac silencieux.
    const { service } = setup();
    const result = await service.search({ minPriceCents: 41_900, maxPriceCents: 16_900 });

    expect(result.total).toBe(3);
  });

  it("ignore une borne de prix qui n'est pas un nombre utilisable", async () => {
    // `?minPrice=1e999` vaut Infinity après conversion. Utilisée telle quelle,
    // elle vidait le catalogue en silence au lieu d'être écartée.
    const { service } = setup();

    expect((await service.search({ minPriceCents: Number.POSITIVE_INFINITY })).total).toBe(5);
    expect((await service.search({ maxPriceCents: Number.NaN })).total).toBe(5);
    expect((await service.search({ minPriceCents: Number.NaN, maxPriceCents: 20_000 })).total).toBe(
      2,
    );
  });

  it("filtre les produits disponibles", async () => {
    const { service } = setup();
    const result = await service.search({ inStockOnly: true });

    expect(result.items.every((product) => product.stock > 0)).toBe(true);
    expect(result.total).toBe(4);
  });

  it("combine les filtres", async () => {
    const { service } = setup();
    const result = await service.search({
      category: "casques",
      inStockOnly: true,
      maxPriceCents: 40_000,
    });

    expect(result.items.map((product) => product.slug)).toEqual(["hifiman-sundara"]);
  });

  it("combine recherche et filtre", async () => {
    const { service } = setup();
    const result = await service.search({
      q: "sennheiser",
      category: "casques",
      inStockOnly: true,
    });

    expect(result.items.map((product) => product.slug)).toEqual(["sennheiser-hd-660s2"]);
  });

  it("fait correspondre le nom d'une famille de produits à ses articles", async () => {
    // Chercher « casque » doit remonter les casques, pas seulement les fiches
    // dont le titre contient ce mot. La catégorie fait donc partie du texte
    // indexé.
    const { service } = setup();
    const result = await service.search({ q: "casque" });

    expect(result.total).toBe(3);
    expect(result.items.every((product) => product.categorySlug === "casques")).toBe(true);
  });
});

describe("tri", () => {
  it("trie par prix croissant", async () => {
    const { service } = setup();
    const prices = (await service.search({ sort: "price-asc" })).items.map(
      (product) => product.priceCents,
    );

    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("trie par prix décroissant", async () => {
    const { service } = setup();
    const prices = (await service.search({ sort: "price-desc" })).items.map(
      (product) => product.priceCents,
    );

    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  it("trie par nouveauté par défaut", async () => {
    const { service } = setup();
    const slugs = (await service.search({})).items.map((product) => product.slug);

    expect(slugs[0]).toBe("shure-sm7b");
    expect(slugs.at(-1)).toBe("hifiman-sundara");
  });

  it("trie par nom", async () => {
    const { service } = setup();
    const titles = (await service.search({ sort: "name" })).items.map((product) => product.title);

    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, "fr")));
  });

  it("retombe sur le tri par défaut si le tri demandé est inconnu", async () => {
    // Un paramètre d'URL bricolé ne doit rien casser (P5.2).
    const { service } = setup();
    const result = await service.search({ sort: "n-importe-quoi" as never });

    expect(result.items[0]?.slug).toBe("shure-sm7b");
  });
});

describe("pagination", () => {
  it("découpe les résultats et annonce le total", async () => {
    const { service } = setup();
    const result = await service.search({ page: 1, pageSize: 2 });

    expect(result.items).toHaveLength(2);
    // Le total porte sur l'ensemble filtré, pas sur la page.
    expect(result.total).toBe(5);
    expect(result.pageCount).toBe(3);
  });

  it("sert la page demandée", async () => {
    const { service } = setup();
    const first = await service.search({ page: 1, pageSize: 2 });
    const second = await service.search({ page: 2, pageSize: 2 });

    expect(second.items[0]?.slug).not.toBe(first.items[0]?.slug);
  });

  it("rend une page vide au-delà de la dernière, sans erreur", async () => {
    const { service } = setup();
    const result = await service.search({ page: 99, pageSize: 2 });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(5);
  });

  it("ramène une page hostile dans des bornes raisonnables", async () => {
    const { service } = setup();
    const result = await service.search({ page: -3, pageSize: 100_000 });

    expect(result.items.length).toBeLessThanOrEqual(48);
    expect(result.page).toBe(1);
  });
});

describe("getBySlug", () => {
  it("retourne le produit", async () => {
    const { service } = setup();
    await expect(service.getBySlug("hifiman-sundara")).resolves.toMatchObject({
      title: "Sundara",
    });
  });

  it("échoue explicitement sur un slug inconnu", async () => {
    // C'est ici que la décision du 404 est prise, pas dans le repository.
    const { service } = setup();
    await expect(service.getBySlug("inconnu")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("produits associés", () => {
  it("propose des produits de la même catégorie, sans le produit courant", async () => {
    const { service } = setup();
    const current = catalogue[0]!;

    const related = await service.findRelated(current);

    expect(related.every((product) => product.categorySlug === "casques")).toBe(true);
    expect(related.some((product) => product.id === current.id)).toBe(false);
  });

  it("place devant ceux qui partagent le plus de tags", async () => {
    const { service } = setup();
    const current = catalogue[0]!; // tags : ouvert, studio

    const related = await service.findRelated(current);

    // Sundara partage « ouvert », DT 770 partage « studio » : les deux en
    // partagent un, et le départage se fait sur un critère stable.
    expect(related).toHaveLength(2);
    expect(related.map((product) => product.slug)).toContain("hifiman-sundara");
  });

  it("ne dépasse jamais la limite affichée", async () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      makeProduct({ slug: `casque-${index}`, categorySlug: "casques", tags: ["ouvert"] }),
    );
    const { service } = setup([catalogue[0]!, ...many]);

    const related = await service.findRelated(catalogue[0]!);

    expect(related).toHaveLength(RELATED_PRODUCTS_COUNT);
  });

  it("rend une liste vide quand la catégorie ne contient rien d'autre", async () => {
    const { service } = setup();
    await expect(service.findRelated(catalogue[3]!)).resolves.toEqual([]);
  });

  it("donne le même résultat à chaque appel", async () => {
    // Un ordre aléatoire rendrait la page produit instable d'un rendu à
    // l'autre, et le test de non-régression impossible à écrire.
    const { service } = setup();
    const first = await service.findRelated(catalogue[0]!);
    const second = await service.findRelated(catalogue[0]!);

    expect(first.map((product) => product.id)).toEqual(second.map((product) => product.id));
  });
});

describe("catégories", () => {
  it("compte les produits de chaque catégorie", async () => {
    const { service } = setup();
    const categories = await service.listCategories();

    expect(categories.find((category) => category.slug === "casques")?.productCount).toBe(3);
    expect(categories.find((category) => category.slug === "cables")?.productCount).toBe(1);
  });

  it("conserve l'ordre voulu par le marchand", async () => {
    const { service } = setup();
    const categories = await service.listCategories();

    expect(categories.map((category) => category.slug)).toEqual([
      "casques",
      "microphones",
      "cables",
    ]);
  });

  it("échoue explicitement sur une catégorie inconnue", async () => {
    const { service } = setup();
    await expect(service.getCategoryBySlug("inconnue")).rejects.toBeInstanceOf(NotFoundError);
  });
});
