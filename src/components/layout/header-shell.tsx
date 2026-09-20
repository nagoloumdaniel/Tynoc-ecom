import { unstable_rethrow } from "next/navigation";

import type { Category } from "@/schemas/category";
import { getCategories } from "@/server/catalogue";

import { Header } from "./header";

/**
 * Chargement des catégories de l'en-tête (P10.1).
 *
 * Lecture **mise en cache**, donc prérendable : l'en-tête entre dans la
 * coquille statique au lieu d'être recalculé à chaque requête.
 *
 * Comme le pied de page, ce composant vit dans la mise en page racine, que
 * `error.tsx` n'enveloppe pas. Il ne lève donc pas : sans catégories, la
 * navigation se réduit au logo, à la recherche et aux compteurs.
 */
export async function HeaderShell() {
  let categories: Category[] = [];

  try {
    categories = await getCategories();
  } catch (error) {
    // Ne jamais avaler l'interruption de prérendu de Next.
    unstable_rethrow(error);

    console.error(
      JSON.stringify({
        level: "warn",
        context: "en-tête dégradé",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  return <Header categories={categories} />;
}
