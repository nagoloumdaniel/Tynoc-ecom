import { unstable_rethrow } from "next/navigation";

import { cartService, wishlistService } from "@/server/services";
import { getOptionalSessionUserId } from "@/server/session";

/**
 * Compteurs de l'en-tête (P10.1).
 *
 * Isolés du reste de l'en-tête, et c'est tout l'enjeu de la phase. Ils sont la
 * **seule** partie de la coquille qui dépende réellement de la requête : les
 * mélanger à la lecture des catégories, comme c'était le cas, suffisait à
 * empêcher le prérendu de toutes les routes du site.
 *
 * Chacun est rendu derrière sa propre frontière Suspense. Le repli part dans
 * la coquille statique, et la valeur arrive en flux. Un compteur de panier ne
 * mérite pas de retarder l'affichage du catalogue.
 */

export async function CartCount() {
  return <>{await safeCount((userId) => cartService.getItemCount(userId))}</>;
}

export async function WishlistCount() {
  return <>{await safeCount(async (userId) => (await wishlistService.list(userId)).length)}</>;
}

/**
 * Lecture tolérante : une panne de base affiche zéro plutôt que de faire
 * tomber la mise en page racine, que `error.tsx` ne peut pas rattraper.
 *
 * `unstable_rethrow` est indispensable ici. Next signale l'interruption d'un
 * prérendu par une exception interne : l'avaler ferait croire à un échec de
 * lecture et figerait un « 0 » dans la coquille statique, alors que le vrai
 * compteur doit arriver en flux à chaque requête.
 */
async function safeCount(read: (userId: string) => Promise<number>): Promise<number> {
  try {
    const userId = await getOptionalSessionUserId();
    if (!userId) return 0;

    return await read(userId);
  } catch (error) {
    unstable_rethrow(error);

    console.error(
      JSON.stringify({
        level: "warn",
        context: "compteur d'en-tête dégradé",
        message: error instanceof Error ? error.message : String(error),
      }),
    );

    return 0;
  }
}
