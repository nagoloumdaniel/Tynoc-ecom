import { z } from "zod";

import { MAX_QUANTITY_PER_LINE } from "@/lib/limits";

import { isoDateSchema, priceCentsSchema, productIdSchema } from "./common";
import { availabilitySchema, productSchema } from "./product";

/**
 * Panier (P2.3).
 *
 * Une ligne de panier ne stocke **pas** le prix du produit. C'est délibéré :
 * un prix recopié devient faux dès la première mise à jour du catalogue, et
 * le brief demande un sous-total juste. Le prix est donc toujours relu depuis
 * le produit au moment du calcul.
 *
 * L'anti-doublon ne repose pas sur du code applicatif mais sur la clé :
 * `SK = CART#<productId>` est unique par utilisateur, donc un second ajout du
 * même produit ne peut qu'incrémenter la quantité existante.
 */
export const cartItemSchema = z.strictObject({
  productId: productIdSchema,
  quantity: z.int().min(1).max(MAX_QUANTITY_PER_LINE),
  addedAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export type CartItem = z.infer<typeof cartItemSchema>;

/**
 * Ligne de panier telle que l'UI la consomme : la ligne brute jointe à son
 * produit, plus les montants calculés côté serveur.
 */
export const cartLineSchema = z.strictObject({
  product: productSchema,
  quantity: z.int().min(1).max(MAX_QUANTITY_PER_LINE),
  addedAt: isoDateSchema,
  /** `quantity * product.priceCents`, calculé, jamais stocké. */
  lineTotalCents: priceCentsSchema,
  availability: availabilitySchema,
  /**
   * Vrai quand la quantité demandée dépasse le stock restant. L'UI affiche
   * l'avertissement, le service a déjà ramené la quantité au plafond.
   */
  exceedsStock: z.boolean(),
});

export type CartLine = z.infer<typeof cartLineSchema>;

/**
 * Récapitulatif complet. Une seule fonction de calcul le produit, et l'UI
 * comme l'API consomment le même objet : deux additions séparées finiraient
 * par diverger.
 */
export const cartSummarySchema = z.strictObject({
  lines: z.array(cartLineSchema),
  /** Nombre d'articles, quantités comprises, pas le nombre de lignes. */
  itemCount: z.int().min(0),
  subtotalCents: z.int().min(0),
  /**
   * Lignes dont le produit a disparu du catalogue entre deux visites. Elles
   * sont signalées plutôt que silencieusement supprimées : l'utilisateur doit
   * comprendre ce qui a changé dans son panier.
   */
  orphanProductIds: z.array(productIdSchema),
});

export type CartSummary = z.infer<typeof cartSummarySchema>;

/** Entrées acceptées par les Server Actions et les routes API du panier. */
export const addToCartInputSchema = z.strictObject({
  productId: productIdSchema,
  quantity: z.int().min(1).max(MAX_QUANTITY_PER_LINE).default(1),
});

export const updateCartQuantityInputSchema = z.strictObject({
  productId: productIdSchema,
  quantity: z.int().min(1).max(MAX_QUANTITY_PER_LINE),
});

export const removeFromCartInputSchema = z.strictObject({
  productId: productIdSchema,
});

export type AddToCartInput = z.infer<typeof addToCartInputSchema>;
export type UpdateCartQuantityInput = z.infer<typeof updateCartQuantityInputSchema>;
export type RemoveFromCartInput = z.infer<typeof removeFromCartInputSchema>;
