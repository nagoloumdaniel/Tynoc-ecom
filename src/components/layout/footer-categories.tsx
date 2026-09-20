import { productService } from "@/server/services";

import { Footer } from "./footer";

/**
 * Chargement des catégories du pied de page.
 *
 * Même découpage que pour l'en-tête : la lecture est isolée pour que la page
 * ne l'attende pas. Le pied de page est tout en bas, donc c'est le dernier
 * élément dont l'affichage doit bloquer quoi que ce soit.
 */
export async function FooterWithCategories() {
  return <Footer categories={await productService.listCategories()} />;
}
