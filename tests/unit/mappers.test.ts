import { describe, expect, it } from "vitest";

import { DatabaseError } from "@/lib/errors";
import {
  cartItemKey,
  categoryKey,
  productKey,
  productListingIndexKey,
  productSlugIndexKey,
  userKey,
  wishlistItemKey,
} from "@/lib/keys";
import {
  toCartItem,
  toCategory,
  toProduct,
  toUser,
  toWishlistItem,
} from "@/server/repositories/mappers";

/**
 * Mappers item DynamoDB vers entité du domaine (P3.6).
 *
 * Leur raison d'être tient en une phrase : **au-dessus du repository, plus
 * personne ne sait que `PK` existe**. Un composant qui reçoit un objet portant
 * `GSI1SK` finira par s'en servir, et la couche de données aura fui.
 *
 * Second rôle, moins visible : un item stocké qui ne correspond plus au schéma
 * est une corruption de base, donc une `DatabaseError`, pas une erreur de
 * l'utilisateur. La distinction change le statut HTTP et le message affiché.
 */

const PRODUCT_ID = "prd_a1b2c3d4e5f6";
const USER_ID = "6f3a1c2e-0d4b-4f8a-9c11-2b7d5e8a4f60";
const NOW = "2026-09-18T10:00:00.000Z";

const productItem = {
  ...productKey(PRODUCT_ID),
  ...productListingIndexKey({ categorySlug: "casques", priceCents: 54_900, productId: PRODUCT_ID }),
  ...productSlugIndexKey("sennheiser-hd-660s2"),
  entityType: "PRODUCT",
  id: PRODUCT_ID,
  slug: "sennheiser-hd-660s2",
  title: "HD 660S2",
  brand: "Sennheiser",
  summary: "Casque ouvert 300 Ω.",
  description: "Transducteur dynamique de 38 mm.",
  priceCents: 54_900,
  stock: 12,
  categorySlug: "casques",
  tags: ["ouvert", "studio"],
  images: [{ url: "https://picsum.photos/seed/x/1200/1200", alt: "HD 660S2" }],
  specs: [{ label: "Impédance", value: "300 Ω" }],
  createdAt: NOW,
  updatedAt: NOW,
};

describe("toProduct", () => {
  it("retourne une entité du domaine dépourvue de toute clé de stockage", () => {
    const product = toProduct(productItem);

    for (const key of ["PK", "SK", "GSI1PK", "GSI1SK", "GSI2PK", "GSI2SK", "entityType"]) {
      expect(product).not.toHaveProperty(key);
    }
    expect(product.id).toBe(PRODUCT_ID);
    expect(product.priceCents).toBe(54_900);
  });

  it("conserve les structures imbriquées", () => {
    const product = toProduct(productItem);

    expect(product.images[0]?.alt).toBe("HD 660S2");
    expect(product.specs[0]).toEqual({ label: "Impédance", value: "300 Ω" });
  });

  it("traite un item corrompu comme une panne serveur, pas comme une faute de l'utilisateur", () => {
    const corrupted = { ...productItem, priceCents: "54900" };

    expect(() => toProduct(corrupted)).toThrow(DatabaseError);
  });

  it("n'expose pas le détail de la corruption au client", () => {
    const corrupted = { ...productItem, priceCents: -5 };

    try {
      toProduct(corrupted);
      expect.unreachable("le mapping aurait dû échouer");
    } catch (error) {
      const appError = error as DatabaseError;
      expect(appError.expose).toBe(false);
      // Le détail reste dans `message`, pour le log serveur uniquement.
      expect(appError.message).toContain("priceCents");
      expect(appError.publicMessage).not.toContain("priceCents");
    }
  });

  it("refuse un item auquel il manque un champ obligatoire", () => {
    const { description: _omitted, ...incomplete } = productItem;

    expect(() => toProduct(incomplete)).toThrow(DatabaseError);
  });
});

describe("toCategory", () => {
  it("retourne une catégorie sans clé de stockage", () => {
    const category = toCategory({
      ...categoryKey("casques"),
      entityType: "CATEGORY",
      slug: "casques",
      name: "Casques",
      description: "Casques ouverts et fermés.",
      position: 1,
      image: { url: "https://picsum.photos/seed/c/1200/1200", alt: "Casques" },
      createdAt: NOW,
      updatedAt: NOW,
    });

    expect(category).not.toHaveProperty("PK");
    expect(category.slug).toBe("casques");
    expect(category.position).toBe(1);
  });
});

describe("toUser", () => {
  it("retourne un profil sans clé ni attribut d'expiration", () => {
    const user = toUser({
      ...userKey(USER_ID),
      entityType: "USER",
      id: USER_ID,
      createdAt: NOW,
      lastSeenAt: NOW,
      // Détail d'implémentation du TTL : n'a rien à faire dans le domaine.
      expiresAt: 1_800_000_000,
    });

    expect(user).not.toHaveProperty("PK");
    expect(user).not.toHaveProperty("expiresAt");
    expect(user.id).toBe(USER_ID);
  });

  it("accepte un profil sans nom d'affichage", () => {
    const user = toUser({
      ...userKey(USER_ID),
      entityType: "USER",
      id: USER_ID,
      createdAt: NOW,
      lastSeenAt: NOW,
    });

    expect(user.displayName).toBeUndefined();
  });
});

describe("toCartItem", () => {
  it("retourne une ligne de panier sans clé de stockage", () => {
    const line = toCartItem({
      ...cartItemKey(USER_ID, PRODUCT_ID),
      entityType: "CART_ITEM",
      productId: PRODUCT_ID,
      quantity: 3,
      addedAt: NOW,
      updatedAt: NOW,
      expiresAt: 1_800_000_000,
    });

    expect(line).toEqual({ productId: PRODUCT_ID, quantity: 3, addedAt: NOW, updatedAt: NOW });
  });

  it("refuse une quantité nulle, qui ne devrait jamais être persistée", () => {
    // Une ligne à zéro est une suppression ratée, pas un état valide.
    const zero = {
      ...cartItemKey(USER_ID, PRODUCT_ID),
      entityType: "CART_ITEM",
      productId: PRODUCT_ID,
      quantity: 0,
      addedAt: NOW,
      updatedAt: NOW,
    };

    expect(() => toCartItem(zero)).toThrow(DatabaseError);
  });
});

describe("toWishlistItem", () => {
  it("retourne une entrée de liste de souhaits sans clé de stockage", () => {
    const entry = toWishlistItem({
      ...wishlistItemKey(USER_ID, PRODUCT_ID),
      entityType: "WISHLIST_ITEM",
      productId: PRODUCT_ID,
      addedAt: NOW,
      expiresAt: 1_800_000_000,
    });

    expect(entry).toEqual({ productId: PRODUCT_ID, addedAt: NOW });
  });
});
