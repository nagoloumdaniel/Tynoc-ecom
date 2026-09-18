/**
 * Fabriques de clés du single-table design (P2.4).
 *
 * Règle du projet : **aucune clé DynamoDB n'est concaténée à la main hors de
 * ce fichier**. Une chaîne `"USER#" + id` écrite dans un repository est un
 * bug, parce qu'elle échappe aux tests et qu'elle diverge silencieusement le
 * jour où le préfixe change.
 *
 * Ce module est volontairement pur : il n'importe ni le SDK, ni l'environnement,
 * ni quoi que ce soit d'asynchrone. Il est donc testable sans base de données,
 * et c'est ce qui permet de vérifier l'ordre de tri sans écrire un seul item.
 *
 * Le modèle complet et son raisonnement sont dans `docs/DATA-MODEL.md`.
 */

/** Noms des index secondaires globaux, tels que créés par `scripts/create-table.ts`. */
export const GSI1_NAME = "GSI1" as const;
export const GSI2_NAME = "GSI2" as const;

/**
 * Partition unique qui porte l'intégralité du catalogue dans GSI1.
 *
 * Choix assumé : avec une seule partition, une `Query` suffit pour lister le
 * catalogue entier comme pour lister une catégorie. La contrepartie est une
 * partition chaude, sans conséquence à l'échelle de cette vitrine (moins de
 * cent produits). À plus grande échelle il faudrait la fragmenter en
 * `PRODUCTS#ALL#0` à `PRODUCTS#ALL#9` et lire les fragments en parallèle.
 */
export const PRODUCTS_PARTITION = "PRODUCTS#ALL" as const;

/** Partition unique des catégories : elles se lisent toujours en bloc. */
export const CATEGORY_COLLECTION_PK = "CATEGORY#ALL" as const;

export const CATEGORY_SK_PREFIX = "CATEGORY#" as const;
export const CART_SK_PREFIX = "CART#" as const;
export const WISHLIST_SK_PREFIX = "WISH#" as const;

/** Clé de tri du profil utilisateur, seul item non préfixé de sa partition. */
export const USER_PROFILE_SK = "PROFILE" as const;

/** Clé de tri de l'item principal d'un produit. */
export const PRODUCT_META_SK = "META" as const;

/**
 * Largeur du montant dans une clé de tri.
 *
 * DynamoDB trie les clés de tri comme des chaînes de caractères : sans
 * largeur fixe, `"900"` se retrouverait après `"1000"`. Dix chiffres couvrent
 * jusqu'à 99 999 999,99 € en centimes, très au-delà du catalogue.
 */
const PRICE_WIDTH = 10;

export interface TableKey {
  PK: string;
  SK: string;
}

export interface ListingIndexKey {
  GSI1PK: string;
  GSI1SK: string;
}

export interface SlugIndexKey {
  GSI2PK: string;
  GSI2SK: string;
}

/**
 * Formate un montant en centimes pour une clé de tri.
 *
 * Échoue bruyamment plutôt que de tronquer : une clé mal formée produirait un
 * tri faux, c'est-à-dire un bug invisible en lecture et impossible à corriger
 * sans réécrire les items.
 */
export function padPrice(priceCents: number): string {
  if (!Number.isInteger(priceCents)) {
    throw new TypeError(`Un prix doit être un entier de centimes, reçu ${priceCents}`);
  }
  if (priceCents < 0) {
    throw new RangeError(`Un prix ne peut pas être négatif, reçu ${priceCents}`);
  }

  const padded = String(priceCents).padStart(PRICE_WIDTH, "0");
  if (padded.length > PRICE_WIDTH) {
    throw new RangeError(
      `Prix hors de l'échelle indexable (${PRICE_WIDTH} chiffres) : ${priceCents}`,
    );
  }

  return padded;
}

/** A1 : récupérer un produit par son identifiant. */
export function productKey(productId: string): TableKey {
  return { PK: `PRODUCT#${productId}`, SK: PRODUCT_META_SK };
}

/** A2 : récupérer un produit par son slug d'URL. */
export function productSlugIndexKey(slug: string): SlugIndexKey {
  return { GSI2PK: `SLUG#${slug}`, GSI2SK: "PRODUCT" };
}

/**
 * A3 et A4 : lister une catégorie triée par prix, ou tout le catalogue.
 *
 * La clé de tri compose catégorie puis prix puis identifiant. Cette
 * composition sert les deux patterns avec un seul index : une `Query` sans
 * condition de tri ramène le catalogue, la même `Query` avec un
 * `begins_with(CATEGORY#<slug>#)` ramène la catégorie déjà triée par prix.
 *
 * L'identifiant en queue départage deux produits au même prix, sans quoi le
 * second écraserait le premier dans l'index.
 */
export function productListingIndexKey(input: {
  categorySlug: string;
  priceCents: number;
  productId: string;
}): ListingIndexKey {
  return {
    GSI1PK: PRODUCTS_PARTITION,
    GSI1SK: `${CATEGORY_SK_PREFIX}${input.categorySlug}#PRICE#${padPrice(input.priceCents)}#${input.productId}`,
  };
}

/**
 * Préfixe de `begins_with` pour restreindre le listing à une catégorie.
 *
 * Le séparateur final est indispensable : sans lui, `casques` ramènerait aussi
 * `casques-sans-fil`.
 */
export function categoryListingPrefix(categorySlug: string): string {
  return `${CATEGORY_SK_PREFIX}${categorySlug}#`;
}

/** A5 : lister les catégories, et les lire une par une. */
export function categoryKey(slug: string): TableKey {
  return { PK: CATEGORY_COLLECTION_PK, SK: `${CATEGORY_SK_PREFIX}${slug}` };
}

/** A11 : lire ou créer le profil d'une session. */
export function userKey(userId: string): TableKey {
  return { PK: `USER#${userId}`, SK: USER_PROFILE_SK };
}

/**
 * A6 et A8 : lire le panier, et adresser une ligne précise.
 *
 * L'anti-doublon exigé par le brief est structurel : la clé de tri contient
 * l'identifiant du produit, donc deux ajouts successifs visent le même item.
 * Le second ne peut qu'incrémenter la quantité.
 */
export function cartItemKey(userId: string, productId: string): TableKey {
  return { PK: `USER#${userId}`, SK: `${CART_SK_PREFIX}${productId}` };
}

/** A7 et A9 : lire la liste de souhaits, et adresser une entrée précise. */
export function wishlistItemKey(userId: string, productId: string): TableKey {
  return { PK: `USER#${userId}`, SK: `${WISHLIST_SK_PREFIX}${productId}` };
}

function productIdFromSortKey(sortKey: string, prefix: string, label: string): string {
  if (!sortKey.startsWith(prefix)) {
    throw new TypeError(`Clé de tri ${label} attendue, reçu "${sortKey}"`);
  }

  const productId = sortKey.slice(prefix.length);
  if (productId.length === 0) {
    throw new TypeError(`Clé de tri ${label} sans identifiant produit : "${sortKey}"`);
  }

  return productId;
}

/** Relit l'identifiant produit d'une ligne de panier renvoyée par une Query. */
export function productIdFromCartSortKey(sortKey: string): string {
  return productIdFromSortKey(sortKey, CART_SK_PREFIX, "de panier");
}

/** Relit l'identifiant produit d'une entrée de liste de souhaits. */
export function productIdFromWishlistSortKey(sortKey: string): string {
  return productIdFromSortKey(sortKey, WISHLIST_SK_PREFIX, "de liste de souhaits");
}
