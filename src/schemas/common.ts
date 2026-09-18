import { z } from "zod";

/**
 * Primitives partagées par tous les schémas du domaine (P2.3).
 *
 * Règle du projet : le schéma Zod est la source de vérité, le type TypeScript
 * en est déduit par `z.infer`. Aucun type du domaine n'est écrit à la main.
 */

/**
 * Identifiant d'URL. Volontairement strict : minuscules, chiffres et tirets
 * simples, sans tiret en tête ni en queue. Un slug voyage dans une clé
 * DynamoDB et dans une URL ; le laisser libre reviendrait à accepter
 * n'importe quel caractère dans une clé de partition.
 */
export const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide : minuscules, chiffres et tirets simples");

/** Identifiant opaque de produit, dérivé du slug au seed (voir `lib/ids.ts`). */
export const productIdSchema = z
  .string()
  .regex(/^prd_[a-z0-9]{12}$/, "Identifiant produit invalide");

/** Identifiant de session utilisateur : UUID v4 tiré de `crypto.randomUUID()`. */
export const userIdSchema = z.uuid();

/**
 * Montant en centimes. Entier, jamais un flottant : `0.1 + 0.2 !== 0.3`, et
 * une erreur d'un centime sur un total est un bug de facturation.
 */
export const priceCentsSchema = z
  .int()
  .positive("Un prix doit être strictement positif")
  .max(100_000_000, "Prix hors de l'échelle du catalogue");

/** Quantité en stock. Zéro est valide : c'est une rupture, pas une erreur. */
export const stockSchema = z.int().min(0).max(100_000);

/** Horodatage ISO 8601 en UTC. */
export const isoDateSchema = z.iso.datetime();

/**
 * Curseur de pagination : la `LastEvaluatedKey` de DynamoDB encodée en
 * base64url. Opaque pour le client, qui ne doit pas pouvoir fabriquer une
 * position arbitraire dans l'index.
 */
export const cursorSchema = z.string().min(1).max(2_000);

export type Slug = z.infer<typeof slugSchema>;
export type ProductId = z.infer<typeof productIdSchema>;
export type UserId = z.infer<typeof userIdSchema>;
export type PriceCents = z.infer<typeof priceCentsSchema>;
export type IsoDate = z.infer<typeof isoDateSchema>;
export type Cursor = z.infer<typeof cursorSchema>;

/**
 * Enveloppe d'une page de résultats. Générique parce que le listing produits,
 * la recherche et les futures listes paginées partagent la même forme.
 */
export interface Page<T> {
  items: T[];
  /** Absent quand il n'y a plus rien à lire. */
  nextCursor?: Cursor;
}
