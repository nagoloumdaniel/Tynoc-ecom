import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { MAX_CART_LINES, MAX_QUANTITY_PER_LINE } from "@/lib/limits";
import type {
  AddToCartInput,
  CartLine,
  CartSummary,
  UpdateCartQuantityInput,
} from "@/schemas/cart";
import type { CartItem } from "@/schemas/cart";
import { availabilityOf, type Product } from "@/schemas/product";

/**
 * Logique métier du panier (P4.1 à P4.4).
 *
 * C'est le cœur évalué du projet, et il est volontairement isolé : ce fichier
 * ne connaît ni React, ni HTTP, ni `PK`, et **n'importe aucun repository**. Il
 * les reçoit en paramètre, donc il se teste sans base de données ni conteneur.
 *
 * Le câblage sur les implémentations DynamoDB vit dans `services/index.ts`.
 * Importer directement un repository ici suffirait à faire remonter la
 * validation de l'environnement AWS dans un test de calcul de sous-total.
 *
 * Trois invariants tenus ici, et nulle part ailleurs :
 *
 * 1. **Le total est recalculé côté serveur**, toujours, à partir du prix
 *    courant du produit. Une ligne de panier ne stocke pas de prix.
 * 2. **La quantité est bornée par le stock réel** au moment de l'opération, et
 *    par le plafond métier du projet.
 * 3. **L'arithmétique est entière**, en centimes. Jamais de flottant pour de
 *    l'argent.
 */

/** Contrats minimaux attendus des repositories, pour rendre le service testable. */
interface ProductReader {
  findById(productId: string): Promise<Product | null>;
  findManyByIds(productIds: string[]): Promise<Product[]>;
}

interface CartStore {
  list(userId: string): Promise<CartItem[]>;
  incrementItem(
    userId: string,
    productId: string,
    delta: number,
    maxQuantity: number,
  ): Promise<CartItem>;
  setQuantity(userId: string, productId: string, quantity: number): Promise<CartItem>;
  removeItem(userId: string, productId: string): Promise<void>;
  clear(userId: string): Promise<void>;
}

/**
 * Résultat d'une modification du panier.
 *
 * `adjusted` vaut vrai quand la quantité appliquée diffère de la quantité
 * demandée, parce que le stock ou le plafond s'y opposaient. Sans cette
 * information, l'interface ne peut pas expliquer pourquoi l'utilisateur voit
 * 3 alors qu'il a demandé 8 : elle afficherait un succès muet.
 */
export interface CartMutationResult {
  summary: CartSummary;
  adjusted: boolean;
}

export function createCartService(deps: {
  productRepository: ProductReader;
  cartRepository: CartStore;
}) {
  const { productRepository: products, cartRepository: cart } = deps;

  /** Quantité maximale réellement atteignable pour un produit donné. */
  function ceilingFor(product: Product): number {
    return Math.min(product.stock, MAX_QUANTITY_PER_LINE);
  }

  async function requireProduct(productId: string): Promise<Product> {
    const product = await products.findById(productId);

    if (!product) {
      throw new NotFoundError("Ce produit n'existe plus.");
    }

    return product;
  }

  /**
   * Assemble le récapitulatif à partir des lignes brutes.
   *
   * Une seule fonction de calcul, réutilisée par l'UI et par l'API : deux
   * additions écrites séparément finissent toujours par diverger.
   */
  async function buildSummary(userId: string): Promise<CartSummary> {
    const items = await cart.list(userId);

    if (items.length === 0) {
      return { lines: [], itemCount: 0, subtotalCents: 0, orphanProductIds: [] };
    }

    // Une seule lecture groupée pour toutes les lignes : une lecture par ligne
    // serait le problème N+1.
    const found = await products.findManyByIds(items.map((item) => item.productId));
    const byId = new Map(found.map((product) => [product.id, product]));

    const lines: CartLine[] = [];
    const orphanProductIds: string[] = [];

    for (const item of items) {
      const product = byId.get(item.productId);

      // Produit retiré du catalogue entre deux visites. La ligne est signalée
      // plutôt que supprimée en silence : l'utilisateur doit comprendre ce qui
      // a changé dans son panier. Sans prix, elle ne peut pas compter dans le
      // total, mais elle ne doit pas non plus le faire échouer.
      if (!product) {
        orphanProductIds.push(item.productId);
        continue;
      }

      lines.push({
        product,
        quantity: item.quantity,
        addedAt: item.addedAt,
        lineTotalCents: product.priceCents * item.quantity,
        availability: availabilityOf(product.stock),
        exceedsStock: item.quantity > product.stock,
      });
    }

    // Ordre stable, du plus ancien au plus récent : un ordre instable ferait
    // sauter les lignes d'un rendu à l'autre.
    lines.sort((left, right) => left.addedAt.localeCompare(right.addedAt));

    return {
      lines,
      itemCount: lines.reduce((total, line) => total + line.quantity, 0),
      subtotalCents: lines.reduce((total, line) => total + line.lineTotalCents, 0),
      orphanProductIds,
    };
  }

  return {
    /** Récapitulatif complet, seul point de vérité des montants. */
    getSummary(userId: string): Promise<CartSummary> {
      return buildSummary(userId);
    },

    /**
     * Nombre d'articles, quantités comprises.
     *
     * Volontairement sans jointure avec le catalogue : ce compteur s'affiche
     * dans l'en-tête de toutes les pages, et le faire passer par la lecture des
     * produits coûterait une requête de plus à chaque rendu.
     *
     * Contrepartie assumée : il compte aussi les lignes orphelines, que
     * `getSummary` écarte faute de prix. Le compteur peut donc afficher un de
     * plus que la page panier le temps qu'un produit retiré du catalogue soit
     * retiré du panier. C'est le seul écart possible entre les deux, il est
     * visible et explicable à l'utilisateur, et il disparaît dès qu'il retire
     * la ligne signalée. Faire l'inverse alourdirait chaque page du site pour
     * un cas de bord.
     */
    async getItemCount(userId: string): Promise<number> {
      const items = await cart.list(userId);
      return items.reduce((total, item) => total + item.quantity, 0);
    },

    /**
     * Ajoute un produit, ou incrémente la ligne existante.
     *
     * L'anti-doublon ne se code pas ici : il vient de la clé de stockage. Le
     * service se contente de calculer l'incrément réellement applicable.
     */
    async addItem(userId: string, input: AddToCartInput): Promise<CartMutationResult> {
      const product = await requireProduct(input.productId);

      if (product.stock <= 0) {
        throw new ConflictError("Ce produit est indisponible pour le moment.");
      }

      const ceiling = ceilingFor(product);
      const lines = await cart.list(userId);
      const existing = lines.find((item) => item.productId === product.id);
      const current = existing?.quantity ?? 0;

      // Plafond du nombre de lignes distinctes, garde-fou d'abus et de coût
      // (P15.19). Il ne porte que sur l'ouverture d'une ligne : un panier plein
      // doit rester modifiable.
      if (!existing && lines.length >= MAX_CART_LINES) {
        throw new ConflictError(`Votre panier est limité à ${MAX_CART_LINES} articles différents.`);
      }

      const target = Math.min(current + input.quantity, ceiling);
      const delta = target - current;

      if (delta <= 0) {
        // Rien ne peut être ajouté. Un succès silencieux laisserait croire que
        // le clic a fonctionné.
        throw new ConflictError(
          current >= MAX_QUANTITY_PER_LINE
            ? `La quantité maximale par article est de ${MAX_QUANTITY_PER_LINE}.`
            : `Il ne reste que ${product.stock} exemplaires, déjà dans votre panier.`,
        );
      }

      await cart.incrementItem(userId, product.id, delta, ceiling);

      return { summary: await buildSummary(userId), adjusted: delta !== input.quantity };
    },

    /** Fixe une quantité absolue, bornée par le stock du moment. */
    async setQuantity(userId: string, input: UpdateCartQuantityInput): Promise<CartMutationResult> {
      // Le plancher se vérifie ici, et pas seulement dans le schéma d'entrée.
      // Une quantité nulle atteignant la base produirait une ligne que le
      // mapper rejette ensuite comme corrompue, et **toute lecture ultérieure
      // du panier** échouerait. Le plancher est 1 : retirer une ligne est une
      // opération distincte, avec son propre appel.
      if (!Number.isInteger(input.quantity) || input.quantity < 1) {
        throw new ValidationError("La quantité doit être un entier supérieur ou égal à 1.");
      }

      const product = await requireProduct(input.productId);

      if (product.stock <= 0) {
        throw new ConflictError("Ce produit est indisponible pour le moment.");
      }

      const target = Math.min(input.quantity, ceilingFor(product));
      await cart.setQuantity(userId, product.id, target);

      return { summary: await buildSummary(userId), adjusted: target !== input.quantity };
    },

    /** Retrait idempotent : retirer une ligne absente n'est pas une erreur. */
    async removeItem(userId: string, productId: string): Promise<CartSummary> {
      await cart.removeItem(userId, productId);
      return buildSummary(userId);
    },

    async clear(userId: string): Promise<CartSummary> {
      await cart.clear(userId);
      return buildSummary(userId);
    },
  };
}

export type CartService = ReturnType<typeof createCartService>;
