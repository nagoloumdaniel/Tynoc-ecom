/**
 * Plafonds métier (P15.19).
 *
 * Ils vivent ici, et pas dans les schémas Zod ni dans les services, parce que
 * trois couches en ont besoin : la validation d'entrée, la règle métier et la
 * documentation de l'API. Une seule valeur, trois lecteurs.
 *
 * Ces bornes ne sont pas cosmétiques : sans elles, un script d'abus peut créer
 * autant de lignes de panier qu'il veut et faire grimper la facture DynamoDB.
 */

/** Quantité maximale d'un même produit sur une ligne de panier. */
export const MAX_QUANTITY_PER_LINE = 10;

/** Nombre maximal de lignes distinctes dans un panier. */
export const MAX_CART_LINES = 50;

/** Nombre maximal de produits dans une liste de souhaits. */
export const MAX_WISHLIST_ITEMS = 100;

/** Taille de page par défaut et plafond absolu du listing produits (P15.20). */
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 48;

/** Longueur maximale acceptée pour une requête de recherche. */
export const MAX_SEARCH_LENGTH = 80;

/** Nombre de produits associés affichés sur une fiche produit. */
export const RELATED_PRODUCTS_COUNT = 4;

/**
 * Durée d'inactivité au bout de laquelle une session, son panier et sa liste
 * de souhaits sont purgés par le TTL DynamoDB (P16.7). Rafraîchie à chaque
 * interaction, donc un panier utilisé n'expire jamais sous l'utilisateur.
 */
export const SESSION_TTL_DAYS = 90;
