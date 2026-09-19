import { handleRoute, ok } from "@/lib/api";
import { productService } from "@/server/services";

/**
 * `GET /api/categories` (P5.4).
 *
 * Liste ordonnée par la position voulue par le marchand, enrichie du nombre de
 * produits pour que la navigation puisse l'afficher sans seconde requête.
 */
export async function GET() {
  return handleRoute("GET /api/categories", async () => {
    return ok(await productService.listCategories());
  });
}
