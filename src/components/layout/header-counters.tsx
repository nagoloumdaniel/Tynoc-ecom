import type { Category } from "@/schemas/category";
import { cartService, productService, wishlistService } from "@/server/services";
import { getOptionalSessionUserId } from "@/server/session";

import { Header } from "./header";

/**
 * Chargement des données de l'en-tête (P9.2).
 *
 * Ce composant **ne doit jamais lever**, et c'est une contrainte
 * d'architecture, pas de la prudence.
 *
 * `error.tsx` enveloppe les pages, mais **pas la mise en page racine qui le
 * contient**. Une exception levée ici ne peut donc être rattrapée que par
 * `global-error.tsx`, qui remplace le document entier : une panne de base
 * ferait disparaître le site au lieu d'afficher une page d'erreur dans sa
 * coquille habituelle.
 *
 * Constaté en conditions réelles avant correction : conteneur arrêté, la
 * réponse était un 200 avec un corps vide. Pire qu'une erreur, parce que rien
 * n'indiquait qu'il y avait un problème.
 *
 * La dégradation est donc explicite. Sans catégories, la navigation se réduit
 * au logo et aux compteurs, et la page en dessous affiche son erreur
 * normalement.
 */
export async function HeaderWithCounters() {
  const [categories, cartCount, wishlistCount] = await Promise.all([
    safely<Category[]>(() => productService.listCategories(), []),
    safelyForSession((userId) => cartService.getItemCount(userId), 0),
    safelyForSession(async (userId) => (await wishlistService.list(userId)).length, 0),
  ]);

  return <Header categories={categories} cartCount={cartCount} wishlistCount={wishlistCount} />;
}

/**
 * Exécute une lecture et retombe sur une valeur neutre en cas d'échec.
 *
 * L'erreur est journalisée côté serveur : la dégradation doit rester visible
 * dans les logs, sinon une panne partielle passe inaperçue pendant des jours.
 */
async function safely<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "warn",
        context: "en-tête dégradé",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return fallback;
  }
}

/** Même principe, mais sans session il n'y a simplement rien à lire. */
async function safelyForSession<T>(read: (userId: string) => Promise<T>, fallback: T): Promise<T> {
  const userId = await safely(() => getOptionalSessionUserId(), null);
  if (!userId) return fallback;

  return safely(() => read(userId), fallback);
}
