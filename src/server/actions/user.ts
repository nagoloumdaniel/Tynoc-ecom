"use server";

import { revalidatePath } from "next/cache";

import type { User } from "@/schemas/user";
import { userService } from "@/server/services";
import { getSessionUserId } from "@/server/session";

import { runAction, type ActionResult } from "./result";

/**
 * Server Actions du profil (P9.4, P16.13).
 *
 * Le brief demande la « gestion des données utilisateur ». Jusqu'ici elle
 * existait côté service et côté base, sans aucune interface : un visiteur ne
 * pouvait ni voir ni modifier ni effacer ce que le site savait de lui.
 */

export async function updateProfileAction(input: unknown): Promise<ActionResult<User>> {
  return runAction("updateProfileAction", async () => {
    const userId = await getSessionUserId();

    // Le service valide avec le **même schéma** que le formulaire côté client.
    // Une seule définition, donc aucune règle qui diverge entre les deux
    // côtés, et le serveur ne fait jamais confiance à la validation du client.
    const user = await userService.updateProfile(userId, input);
    revalidatePath("/account");

    return user;
  });
}

/**
 * Droit à l'effacement (art. 17).
 *
 * Supprime réellement la partition de l'utilisateur : profil, panier et liste
 * de souhaits. Le nombre d'items supprimés est remonté pour que l'interface
 * puisse le confirmer au lieu de l'affirmer.
 *
 * Le cookie n'est pas effacé : la session reste, simplement vide. La purger
 * imposerait au visiteur d'en obtenir une nouvelle au prochain clic, sans
 * aucun gain pour lui.
 */
export async function eraseMyDataAction(): Promise<ActionResult<{ deleted: number }>> {
  return runAction("eraseMyDataAction", async () => {
    const userId = await getSessionUserId();
    const result = await userService.eraseData(userId);

    revalidatePath("/account");
    revalidatePath("/cart");
    revalidatePath("/wishlist");

    return result;
  });
}
