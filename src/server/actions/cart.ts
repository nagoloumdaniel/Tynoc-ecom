"use server";

import { revalidatePath } from "next/cache";

import {
  addToCartInputSchema,
  removeFromCartInputSchema,
  updateCartQuantityInputSchema,
  type CartSummary,
} from "@/schemas/cart";
import { cartService } from "@/server/services";
import { getSessionUserId } from "@/server/session";

import { runAction, type ActionResult } from "./result";

/**
 * Server Actions du panier (P5.7).
 *
 * Une Server Action est un endpoint POST public : le fait qu'elle ne soit
 * appelée que depuis un formulaire rendu par nos soins n'est pas une frontière
 * de sécurité. Chaque action revalide donc ses entrées et redérive l'identité,
 * exactement comme une route HTTP.
 *
 * Aucune n'accepte d'identifiant d'utilisateur. Les schémas sont des
 * `strictObject`, donc un `userId` glissé dans le formulaire est refusé, pas
 * ignoré (P15.1, P15.7).
 *
 * Sur la revalidation : `revalidatePath` provoque un nouveau rendu serveur de
 * la route courante, dont la réponse repart dans le même aller-retour. Le
 * compteur de l'en-tête se met donc à jour sans invalidation globale, puisque
 * la page qui a déclenché l'action est justement celle qui le contient.
 */

export interface CartActionData extends CartSummary {
  /** Vrai quand la quantité appliquée diffère de celle demandée. */
  adjusted: boolean;
}

function revalidateCart(): void {
  revalidatePath("/cart");
}

export async function addToCartAction(input: unknown): Promise<ActionResult<CartActionData>> {
  return runAction("addToCartAction", async () => {
    const userId = await getSessionUserId();
    const parsed = addToCartInputSchema.parse(input);

    const { summary, adjusted } = await cartService.addItem(userId, parsed);
    revalidateCart();

    return { ...summary, adjusted };
  });
}

export async function setCartQuantityAction(input: unknown): Promise<ActionResult<CartActionData>> {
  return runAction("setCartQuantityAction", async () => {
    const userId = await getSessionUserId();
    const parsed = updateCartQuantityInputSchema.parse(input);

    const { summary, adjusted } = await cartService.setQuantity(userId, parsed);
    revalidateCart();

    return { ...summary, adjusted };
  });
}

export async function removeFromCartAction(input: unknown): Promise<ActionResult<CartSummary>> {
  return runAction("removeFromCartAction", async () => {
    const userId = await getSessionUserId();
    const { productId } = removeFromCartInputSchema.parse(input);

    const summary = await cartService.removeItem(userId, productId);
    revalidateCart();

    return summary;
  });
}

export async function clearCartAction(): Promise<ActionResult<CartSummary>> {
  return runAction("clearCartAction", async () => {
    const userId = await getSessionUserId();

    const summary = await cartService.clear(userId);
    revalidateCart();

    return summary;
  });
}
