import { describe, expect, it } from "vitest";

import {
  CART_SK_PREFIX,
  CATEGORY_COLLECTION_PK,
  CATEGORY_SK_PREFIX,
  PRODUCTS_PARTITION,
  WISHLIST_SK_PREFIX,
  cartItemKey,
  categoryKey,
  categoryListingPrefix,
  padPrice,
  productIdFromCartSortKey,
  productIdFromWishlistSortKey,
  productKey,
  productListingIndexKey,
  productSlugIndexKey,
  userKey,
  wishlistItemKey,
} from "@/lib/keys";

const USER = "6f3a1c2e-0d4b-4f8a-9c11-2b7d5e8a4f60";
const PRODUCT = "prd_a1b2c3d4e5f6";

describe("padPrice", () => {
  it("produit une largeur fixe de dix chiffres", () => {
    expect(padPrice(0)).toBe("0000000000");
    expect(padPrice(54_900)).toBe("0000054900");
    expect(padPrice(100_000_000)).toBe("0100000000");
  });

  it("préserve l'ordre numérique dans l'ordre lexicographique", () => {
    // C'est toute la raison d'être du padding : DynamoDB trie les clés de tri
    // comme des chaînes. Sans lui, "900" viendrait après "1000".
    const cents = [900, 1_000, 9_900, 54_900, 189_900];
    const padded = cents.map(padPrice);
    expect([...padded].sort()).toEqual(padded);
    expect(padPrice(900) < padPrice(1_000)).toBe(true);
  });

  it("refuse un montant non entier ou négatif", () => {
    expect(() => padPrice(19.99)).toThrow();
    expect(() => padPrice(-1)).toThrow();
  });

  it("refuse un montant qui déborde la largeur fixée", () => {
    expect(() => padPrice(10_000_000_000)).toThrow();
  });
});

describe("clés produit", () => {
  it("adresse un produit par son identifiant", () => {
    expect(productKey(PRODUCT)).toEqual({ PK: `PRODUCT#${PRODUCT}`, SK: "META" });
  });

  it("adresse un produit par son slug via GSI2", () => {
    expect(productSlugIndexKey("sennheiser-hd-660s2")).toEqual({
      GSI2PK: "SLUG#sennheiser-hd-660s2",
      GSI2SK: "PRODUCT",
    });
  });

  it("place tous les produits dans une partition de listing unique", () => {
    const key = productListingIndexKey({
      categorySlug: "casques",
      priceCents: 54_900,
      productId: PRODUCT,
    });

    expect(key.GSI1PK).toBe(PRODUCTS_PARTITION);
    expect(key.GSI1SK).toBe(`CATEGORY#casques#PRICE#0000054900#${PRODUCT}`);
  });

  it("trie par prix croissant à l'intérieur d'une catégorie", () => {
    const cheap = productListingIndexKey({
      categorySlug: "casques",
      priceCents: 8_900,
      productId: "prd_000000000001",
    });
    const dear = productListingIndexKey({
      categorySlug: "casques",
      priceCents: 189_900,
      productId: "prd_000000000002",
    });

    expect(cheap.GSI1SK < dear.GSI1SK).toBe(true);
  });

  it("isole les catégories les unes des autres", () => {
    // Le préfixe de `begins_with` doit se terminer par le séparateur, sinon
    // "casques" ramènerait aussi "casques-sans-fil".
    const prefix = categoryListingPrefix("casques");
    expect(prefix).toBe("CATEGORY#casques#");

    const inside = productListingIndexKey({
      categorySlug: "casques",
      priceCents: 1_000,
      productId: PRODUCT,
    }).GSI1SK;
    const outside = productListingIndexKey({
      categorySlug: "casques-sans-fil",
      priceCents: 1_000,
      productId: PRODUCT,
    }).GSI1SK;

    expect(inside.startsWith(prefix)).toBe(true);
    expect(outside.startsWith(prefix)).toBe(false);
  });
});

describe("clés catégorie", () => {
  it("regroupe toutes les catégories sous une partition interrogeable", () => {
    expect(categoryKey("casques")).toEqual({
      PK: CATEGORY_COLLECTION_PK,
      SK: `${CATEGORY_SK_PREFIX}casques`,
    });
  });
});

describe("clés utilisateur, panier et liste de souhaits", () => {
  it("range le profil, le panier et la wishlist sous la même partition", () => {
    // Un seul utilisateur, une seule partition : lire son panier coûte une
    // Query, pas une jointure.
    const partition = `USER#${USER}`;
    expect(userKey(USER).PK).toBe(partition);
    expect(cartItemKey(USER, PRODUCT).PK).toBe(partition);
    expect(wishlistItemKey(USER, PRODUCT).PK).toBe(partition);
  });

  it("sépare le profil des collections par le préfixe de clé de tri", () => {
    expect(userKey(USER).SK).toBe("PROFILE");
    expect(cartItemKey(USER, PRODUCT).SK).toBe(`${CART_SK_PREFIX}${PRODUCT}`);
    expect(wishlistItemKey(USER, PRODUCT).SK).toBe(`${WISHLIST_SK_PREFIX}${PRODUCT}`);
  });

  it("garantit l'anti-doublon par unicité de la clé de tri", () => {
    // Deux ajouts du même produit visent exactement le même item : la base
    // rend le doublon impossible, sans code applicatif pour l'empêcher.
    expect(cartItemKey(USER, PRODUCT)).toEqual(cartItemKey(USER, PRODUCT));
    expect(wishlistItemKey(USER, PRODUCT)).toEqual(wishlistItemKey(USER, PRODUCT));
  });

  it("ne confond jamais une ligne de panier avec une entrée de wishlist", () => {
    expect(cartItemKey(USER, PRODUCT).SK).not.toBe(wishlistItemKey(USER, PRODUCT).SK);
    expect(cartItemKey(USER, PRODUCT).SK.startsWith(WISHLIST_SK_PREFIX)).toBe(false);
    expect(wishlistItemKey(USER, PRODUCT).SK.startsWith(CART_SK_PREFIX)).toBe(false);
  });

  it("relit l'identifiant produit depuis la clé de tri", () => {
    expect(productIdFromCartSortKey(cartItemKey(USER, PRODUCT).SK)).toBe(PRODUCT);
    expect(productIdFromWishlistSortKey(wishlistItemKey(USER, PRODUCT).SK)).toBe(PRODUCT);
  });

  it("refuse de relire une clé de tri d'un autre type", () => {
    expect(() => productIdFromCartSortKey(`${WISHLIST_SK_PREFIX}${PRODUCT}`)).toThrow();
    expect(() => productIdFromWishlistSortKey("PROFILE")).toThrow();
  });
});
