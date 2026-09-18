import { z } from "zod";

import { isoDateSchema, productIdSchema } from "./common";
import { availabilitySchema, productSchema } from "./product";

/**
 * Liste de souhaits (P2.3).
 *
 * Même principe d'anti-doublon que le panier, mais avec une conséquence
 * différente : ajouter deux fois le même produit au panier incrémente une
 * quantité, alors qu'ici il n'y a rien à incrémenter. L'ajout est donc
 * **idempotent** et un second ajout n'est pas une erreur utilisateur.
 */
export const wishlistItemSchema = z.strictObject({
  productId: productIdSchema,
  addedAt: isoDateSchema,
});

export type WishlistItem = z.infer<typeof wishlistItemSchema>;

/** Entrée de liste jointe à son produit, telle que l'UI la consomme. */
export const wishlistEntrySchema = z.strictObject({
  product: productSchema,
  addedAt: isoDateSchema,
  availability: availabilitySchema,
});

export type WishlistEntry = z.infer<typeof wishlistEntrySchema>;

export const wishlistInputSchema = z.strictObject({
  productId: productIdSchema,
});

export type WishlistInput = z.infer<typeof wishlistInputSchema>;
