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
 * Paramètres d'URL du **listing public**, distincts de ceux de l'API.
 *
 * Une différence assumée : les prix sont ici en **euros**, pas en centimes.
 * `?minPrice=50` se lit et se partage, `?minPrice=5000` se prête à
 * l'incompréhension. La conversion se fait à la lecture, et l'argent reste en
 * centimes partout ailleurs.
 *
 * Schéma **non strict**, contrairement à l'API : une page publique reçoit des
 * `utm_source` et autres paramètres de suivi, et refuser la page pour cette
 * raison serait absurde. Les paramètres inconnus sont simplement ignorés.
 */
export const storefrontQuerySchema = z.object({
  q: z.string().trim().max(MAX_SEARCH_LENGTH).optional().catch(undefined),
  category: slugSchema.optional().catch(undefined),
  minPrice: z.coerce.number().min(0).max(1_000_000).optional().catch(undefined),
  maxPrice: z.coerce.number().min(0).max(1_000_000).optional().catch(undefined),
  inStock: z.literal("true").optional().catch(undefined),
  sort: productSortSchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1_000).optional().catch(undefined),
});

export type StorefrontQuery = z.infer<typeof storefrontQuerySchema>;

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
