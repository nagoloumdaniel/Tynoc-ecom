import type { Category } from "@/schemas/category";
import { productService } from "@/server/services";

import { Footer } from "./footer";

/**
 * Chargement des catégories du pied de page (P9.2).
 *
 * Même contrainte que pour l'en-tête : ce composant vit dans la mise en page
 * racine, donc `error.tsx` ne peut pas le rattraper. Il ne lève pas.
 *
 * Le `try` n'entoure que la **lecture**, jamais la construction du JSX. React
 * ne rend pas un composant au moment où son JSX est écrit : une erreur de
 * rendu ne serait donc pas rattrapée ici, et l'entourer laisserait croire le
 * contraire.
 *
 * Sans catégories, le pied de page garde ses liens fixes et perd la colonne
 * « catalogue ». C'est une perte acceptable ; faire tomber le document entier
 * pour une liste de liens ne l'est pas.
 */
export async function FooterWithCategories() {
  let categories: Category[] = [];

  try {
    categories = await productService.listCategories();
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "warn",
        context: "pied de page dégradé",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  return <Footer categories={categories} />;
}
