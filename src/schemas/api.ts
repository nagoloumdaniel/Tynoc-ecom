import { z } from "zod";

import { MAX_PAGE_SIZE, MAX_SEARCH_LENGTH } from "@/lib/limits";

import { productIdSchema, slugSchema } from "./common";
import { productSortSchema } from "./product";

/**
 * Schémas de la frontière HTTP (P5.2, P15.7).
 *
 * Tout ce qui entre par une URL ou par un corps de requête passe par un schéma,
 * sans exception. Deux principes :
 *
 * - **`strictObject`** : un champ inconnu est refusé, pas ignoré. C'est ce qui
 *   empêche un appelant de glisser un `userId` en espérant qu'il soit lu.
 * - **Les bornes sont ici**, pas dans le service : une taille de page
 *   déraisonnable est refusée avant d'atteindre la moindre lecture.
 */

/** Les valeurs d'une query string sont des chaînes : le schéma les convertit. */
const booleanParam = z.enum(["true", "false"]).optional();

export const productQuerySchema = z.strictObject({
  q: z.string().trim().max(MAX_SEARCH_LENGTH).optional(),
  category: slugSchema.optional(),
  /** Bornes exprimées en centimes, comme partout ailleurs dans le projet. */
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  inStock: booleanParam,
  sort: productSortSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  // Plafond appliqué dès la validation : une requête hostile est refusée au
  // lieu d'être silencieusement ramenée dans les clous (P15.20).
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

/** Aucun paramètre attendu : en accepter serait laisser croire qu'ils agissent. */
export const emptyQuerySchema = z.strictObject({});

/**
 * Suppression d'une ligne de panier, ou vidage complet si le produit est
 * absent. Le produit passe par la query string : un corps sur un `DELETE` est
 * mal pris en charge par une partie des clients et des intermédiaires HTTP.
 */
export const deleteCartQuerySchema = z.strictObject({
  productId: productIdSchema.optional(),
});

/** Retrait d'une entrée de liste de souhaits, même raisonnement. */
export const deleteWishlistQuerySchema = z.strictObject({
  productId: productIdSchema,
});
