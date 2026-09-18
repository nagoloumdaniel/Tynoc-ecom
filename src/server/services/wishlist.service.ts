import { ConflictError, NotFoundError, isAppError } from "@/lib/errors";
import { MAX_WISHLIST_ITEMS } from "@/lib/limits";
import type { CartSummary } from "@/schemas/cart";
import { availabilityOf, type Product } from "@/schemas/product";
import type { WishlistEntry, WishlistItem } from "@/schemas/wishlist";

/**
 * Logique métier de la liste de souhaits (P4.5).
 *
 * La différence de fond avec le panier tient en une phrase : ajouter deux fois
 * le même produit au panier incrémente une quantité, alors qu'ici il n'y a rien
 * à incrémenter. L'ajout est donc **idempotent**.
 *
 * Le repository, lui, refuse le doublon par condition d'écriture, et c'est
 * volontaire : la base dit ce qui s'est réellement passé, et c'est le service
 * qui décide que ce n'est pas une erreur pour l'utilisateur. Décider l'inverse
 * plus bas priverait ce service de l'information.
 */

interface ProductReader {
  findById(productId: string): Promise<Product | null>;
  findManyByIds(productIds: string[]): Promise<Product[]>;
}

interface WishlistStore {
  list(userId: string): Promise<WishlistItem[]>;
  add(userId: string, productId: string): Promise<WishlistItem>;
  remove(userId: string, productId: string): Promise<void>;
  has(userId: string, productId: string): Promise<boolean>;
}

interface CartWriter {
  addItem(userId: string, input: { productId: string; quantity: number }): Promise<unknown>;
  getSummary(userId: string): Promise<CartSummary>;
}

export function createWishlistService(deps: {
  productRepository: ProductReader;
  wishlistRepository: WishlistStore;
  cartService: CartWriter;
}) {
  const { productRepository: products, wishlistRepository: wishlist, cartService: cart } = deps;

  /**
   * Ajout idempotent.
   *
   * Déclaré en fonction nommée plutôt qu'en méthode appelée via `this` : une
   * Server Action écrit volontiers `const { toggle } = wishlistService`, et une
   * méthode qui dépend de `this` casserait à cet instant sans que le typage
   * n'ait rien signalé.
   */
  async function add(userId: string, productId: string): Promise<{ added: boolean }> {
    const product = await products.findById(productId);
    if (!product) {
      throw new NotFoundError("Ce produit n'existe plus.");
    }

    const existing = await wishlist.list(userId);
    if (existing.some((item) => item.productId === productId)) {
      return { added: false };
    }

    if (existing.length >= MAX_WISHLIST_ITEMS) {
      throw new ConflictError(
        `Votre liste de souhaits est limitée à ${MAX_WISHLIST_ITEMS} produits.`,
      );
    }

    try {
      await wishlist.add(userId, productId);
      return { added: true };
    } catch (error) {
      // Course entre deux onglets : l'entrée existe désormais, ce qui est le
      // résultat voulu. Rien à signaler à l'utilisateur.
      if (isAppError(error) && error.code === "CONFLICT") {
        return { added: false };
      }
      throw error;
    }
  }

  return {
    /** Entrées jointes à leur produit, les plus récentes en premier. */
    async list(userId: string): Promise<WishlistEntry[]> {
      const items = await wishlist.list(userId);
      if (items.length === 0) return [];

      const found = await products.findManyByIds(items.map((item) => item.productId));
      const byId = new Map(found.map((product) => [product.id, product]));

      return items
        .flatMap((item) => {
          const product = byId.get(item.productId);
          // Produit retiré du catalogue. Contrairement au panier, il n'y a
          // aucun montant en jeu et rien à expliquer : l'entrée disparaît.
          if (!product) return [];

          return [{ product, addedAt: item.addedAt, availability: availabilityOf(product.stock) }];
        })
        .sort((left, right) => right.addedAt.localeCompare(left.addedAt));
    },

    has(userId: string, productId: string): Promise<boolean> {
      return wishlist.has(userId, productId);
    },

    /**
     * `added` distingue « je viens de l'ajouter » de « c'était déjà là », ce
     * qui permet à l'interface de choisir son message sans redemander l'état.
     *
     * Un produit en rupture est acceptable ici : c'est même l'usage principal
     * d'une liste de souhaits.
     */
    add,

    async remove(userId: string, productId: string): Promise<void> {
      await wishlist.remove(userId, productId);
    },

    /**
     * Bascule, pour le bouton favori présent sur tous les points d'entrée.
     *
     * Le résultat décrit l'**état final**, pas ce que l'opération a fait. La
     * nuance compte : si `add` répond « c'était déjà là », parce que deux clics
     * se sont croisés ou qu'une lecture cohérente à terme est arrivée en
     * retard, le produit est bel et bien dans la liste et le cœur doit
     * s'afficher rempli.
     */
    async toggle(userId: string, productId: string): Promise<{ inWishlist: boolean }> {
      if (await wishlist.has(userId, productId)) {
        await wishlist.remove(userId, productId);
        return { inWishlist: false };
      }

      await add(userId, productId);
      return { inWishlist: true };
    },

    /**
     * Déplace un produit vers le panier.
     *
     * L'ordre des deux opérations est la garantie : on ajoute d'abord au
     * panier, on ne retire de la liste qu'ensuite. Si l'ajout échoue, par
     * exemple sur un produit tombé en rupture, l'entrée reste en place. Dans
     * l'ordre inverse, le produit disparaîtrait de la liste sans jamais
     * arriver dans le panier.
     */
    async moveToCart(userId: string, productId: string): Promise<CartSummary> {
      if (!(await wishlist.has(userId, productId))) {
        throw new NotFoundError("Ce produit n'est pas dans votre liste de souhaits.");
      }

      await cart.addItem(userId, { productId, quantity: 1 });
      await wishlist.remove(userId, productId);

      return cart.getSummary(userId);
    },
  };
}

export type WishlistService = ReturnType<typeof createWishlistService>;
