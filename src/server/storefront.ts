import "server-only";

import { wishlistService } from "@/server/services";
import { getOptionalSessionUserId } from "@/server/session";

/**
 * Identifiants des produits en liste de souhaits pour la session courante.
 *
 * Lu **une seule fois par page** et passé à la grille, plutôt qu'interrogé par
 * chaque carte : douze cartes produiraient douze lectures pour afficher douze
 * cœurs.
 *
 * C'est aussi ce qui satisfait l'exigence de P8.7, l'état du bouton favori est
 * lu en base et non déduit localement. Sans cela, le cœur repartirait vide à
 * chaque rechargement sur un produit pourtant en favori.
 *
 * Session absente : un ensemble vide, pas une erreur. Un visiteur sans session
 * n'a simplement aucun favori.
 */
export async function getWishlistProductIds(): Promise<Set<string>> {
  const userId = await getOptionalSessionUserId();
  if (!userId) return new Set();

  const entries = await wishlistService.list(userId);
  return new Set(entries.map((entry) => entry.product.id));
}
