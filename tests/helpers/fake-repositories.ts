import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { CartItem } from "@/schemas/cart";
import type { Category } from "@/schemas/category";
import type { Product } from "@/schemas/product";
import type { User, UserProfileUpdate } from "@/schemas/user";
import type { WishlistItem } from "@/schemas/wishlist";

/**
 * Repositories en mémoire pour les tests de services.
 *
 * Ce ne sont pas des doublures d'espionnage : ce sont de vraies
 * implémentations du même contrat, avec le même comportement observable, y
 * compris les erreurs. Un test qui vérifie « le service traduit le doublon en
 * opération idempotente » doit voir un vrai `ConflictError`, pas un booléen
 * programmé pour l'occasion.
 *
 * Les implémentations DynamoDB sont couvertes de leur côté par la suite
 * d'intégration : les deux se répondent.
 */

function nowIso(): string {
  return new Date().toISOString();
}

export function createFakeProductRepository(products: Product[] = []) {
  const byId = new Map(products.map((product) => [product.id, product]));

  return {
    catalogue: byId,

    async findById(productId: string): Promise<Product | null> {
      return byId.get(productId) ?? null;
    },

    async findBySlug(slug: string): Promise<Product | null> {
      return [...byId.values()].find((product) => product.slug === slug) ?? null;
    },

    async findAll(): Promise<Product[]> {
      return [...byId.values()];
    },

    async findByCategory(categorySlug: string): Promise<Product[]> {
      return [...byId.values()]
        .filter((product) => product.categorySlug === categorySlug)
        .sort((left, right) => left.priceCents - right.priceCents);
    },

    async findManyByIds(productIds: string[]): Promise<Product[]> {
      return [...new Set(productIds)]
        .map((id) => byId.get(id))
        .filter((product): product is Product => product !== undefined);
    },
  };
}

export function createFakeCartRepository(initial: Record<string, CartItem[]> = {}) {
  const carts = new Map<string, Map<string, CartItem>>(
    Object.entries(initial).map(([userId, items]) => [
      userId,
      new Map(items.map((item) => [item.productId, item])),
    ]),
  );

  function lines(userId: string): Map<string, CartItem> {
    const existing = carts.get(userId);
    if (existing) return existing;

    const created = new Map<string, CartItem>();
    carts.set(userId, created);
    return created;
  }

  return {
    async list(userId: string): Promise<CartItem[]> {
      return [...lines(userId).values()];
    },

    async incrementItem(
      userId: string,
      productId: string,
      delta: number,
      maxQuantity: number,
    ): Promise<CartItem> {
      // Mêmes préconditions que l'implémentation DynamoDB.
      if (!Number.isInteger(delta) || delta < 1) {
        throw new ValidationError("La quantité ajoutée doit être un entier positif.");
      }
      if (delta > maxQuantity) {
        throw new ValidationError(`La quantité maximale par article est de ${maxQuantity}.`);
      }

      const cart = lines(userId);
      const existing = cart.get(productId);

      if (existing && existing.quantity > maxQuantity - delta) {
        throw new ConflictError("Cette opération entre en conflit avec l'état actuel.");
      }

      const updated: CartItem = {
        productId,
        quantity: (existing?.quantity ?? 0) + delta,
        addedAt: existing?.addedAt ?? nowIso(),
        updatedAt: nowIso(),
      };

      cart.set(productId, updated);
      return updated;
    },

    async setQuantity(userId: string, productId: string, quantity: number): Promise<CartItem> {
      const cart = lines(userId);
      const existing = cart.get(productId);

      if (!existing) {
        throw new NotFoundError("Cet article n'est plus dans votre panier.");
      }

      const updated: CartItem = { ...existing, quantity, updatedAt: nowIso() };
      cart.set(productId, updated);
      return updated;
    },

    async removeItem(userId: string, productId: string): Promise<void> {
      lines(userId).delete(productId);
    },

    async clear(userId: string): Promise<void> {
      lines(userId).clear();
    },
  };
}

export function createFakeWishlistRepository(initial: Record<string, WishlistItem[]> = {}) {
  const wishlists = new Map<string, Map<string, WishlistItem>>(
    Object.entries(initial).map(([userId, items]) => [
      userId,
      new Map(items.map((item) => [item.productId, item])),
    ]),
  );

  function entries(userId: string): Map<string, WishlistItem> {
    const existing = wishlists.get(userId);
    if (existing) return existing;

    const created = new Map<string, WishlistItem>();
    wishlists.set(userId, created);
    return created;
  }

  return {
    async list(userId: string): Promise<WishlistItem[]> {
      return [...entries(userId).values()];
    },

    async add(userId: string, productId: string): Promise<WishlistItem> {
      const list = entries(userId);

      // Comme la base : le doublon est une erreur ici, et c'est au service de
      // décider que ce n'en est pas une pour l'utilisateur.
      if (list.has(productId)) {
        throw new ConflictError("Cette opération entre en conflit avec l'état actuel.");
      }

      const entry: WishlistItem = { productId, addedAt: nowIso() };
      list.set(productId, entry);
      return entry;
    },

    async remove(userId: string, productId: string): Promise<void> {
      entries(userId).delete(productId);
    },

    async has(userId: string, productId: string): Promise<boolean> {
      return entries(userId).has(productId);
    },

    /** Utilitaire de test, sans équivalent dans le contrat du repository. */
    async clearAll(userId: string): Promise<void> {
      entries(userId).clear();
    },
  };
}

/**
 * `onDelete` reproduit une propriété réelle du repository DynamoDB :
 * `deleteAll` efface **toute la partition** de l'utilisateur, donc son panier
 * et sa liste de souhaits avec son profil. Sans ce rappel, la doublure serait
 * plus indulgente que la vraie implémentation et le test de l'effacement ne
 * prouverait rien.
 */
export function createFakeUserRepository(
  initial: User[] = [],
  hooks: { onDelete?: (userId: string) => void } = {},
) {
  const users = new Map(initial.map((user) => [user.id, user]));

  return {
    async findById(userId: string): Promise<User | null> {
      return users.get(userId) ?? null;
    },

    async findOrCreate(userId: string): Promise<User> {
      const existing = users.get(userId);
      if (existing) {
        const touched = { ...existing, lastSeenAt: nowIso() };
        users.set(userId, touched);
        return touched;
      }

      const created: User = { id: userId, createdAt: nowIso(), lastSeenAt: nowIso() };
      users.set(userId, created);
      return created;
    },

    async touch(userId: string): Promise<string> {
      const at = nowIso();
      const existing = users.get(userId);
      if (existing) users.set(userId, { ...existing, lastSeenAt: at });
      return at;
    },

    async updateProfile(userId: string, update: UserProfileUpdate): Promise<User> {
      const existing = users.get(userId);
      if (!existing) throw new NotFoundError("Ce profil n'existe pas ou a expiré.");

      const updated = { ...existing, ...update, lastSeenAt: nowIso() };
      users.set(userId, updated);
      return updated;
    },

    async deleteAll(userId: string): Promise<number> {
      const existed = users.delete(userId);
      hooks.onDelete?.(userId);
      return existed ? 1 : 0;
    },
  };
}

export function createFakeCategoryRepository(categories: Category[] = []) {
  return {
    async findAll(): Promise<Category[]> {
      return [...categories].sort((left, right) => left.position - right.position);
    },

    async findBySlug(slug: string): Promise<Category | null> {
      return categories.find((category) => category.slug === slug) ?? null;
    },
  };
}
