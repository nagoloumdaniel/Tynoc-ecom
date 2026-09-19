"use server";

import { revalidatePath } from "next/cache";

import type { CartSummary } from "@/schemas/cart";
import { wishlistInputSchema, type WishlistEntry } from "@/schemas/wishlist";
import { wishlistService } from "@/server/services";
import { getSessionUserId } from "@/server/session";

import { runAction, type ActionResult } from "./result";

/**
 * Server Actions de la liste de souhaits (P5.7).
 *
 * Le bouton favori apparaît sur la carte produit, sur la fiche produit et sur
 * la page wishlist. Il appelle donc une **bascule** plutôt qu'un ajout : le
 * composant n'a pas à savoir dans quel état il se trouve, et deux clics
 * rapprochés ne produisent pas deux ajouts.
 */

export async function toggleWishlistAction(
  input: unknown,
): Promise<ActionResult<{ inWishlist: boolean }>> {
  return runAction("toggleWishlistAction", async () => {
    const userId = await getSessionUserId();
    const { productId } = wishlistInputSchema.parse(input);

    const result = await wishlistService.toggle(userId, productId);
    revalidatePath("/wishlist");

    return result;
  });
}

export async function removeFromWishlistAction(
  input: unknown,
): Promise<ActionResult<WishlistEntry[]>> {
  return runAction("removeFromWishlistAction", async () => {
    const userId = await getSessionUserId();
    const { productId } = wishlistInputSchema.parse(input);

    await wishlistService.remove(userId, productId);
    revalidatePath("/wishlist");

    return wishlistService.list(userId);
  });
}

/**
 * Déplace un produit de la liste vers le panier.
 *
 * Les deux pages sont revalidées, puisque les deux changent. L'ordre des
 * opérations, lui, est garanti par le service : si l'ajout au panier échoue,
 * l'entrée reste dans la liste.
 */
export async function moveToCartAction(input: unknown): Promise<ActionResult<CartSummary>> {
  return runAction("moveToCartAction", async () => {
    const userId = await getSessionUserId();
    const { productId } = wishlistInputSchema.parse(input);

    const summary = await wishlistService.moveToCart(userId, productId);
    revalidatePath("/wishlist");
    revalidatePath("/cart");

    return summary;
  });
}
