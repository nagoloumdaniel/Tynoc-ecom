import type { NextRequest } from "next/server";

import { handleRoute, ok, parseQuery } from "@/lib/api";
import { productQuerySchema } from "@/schemas/api";
import { productService } from "@/server/services";

/**
 * `GET /api/products` (P5.2).
 *
 * Recherche, filtres, tri et pagination. La route ne fait que trois choses :
 * valider les paramètres, appeler le service, emballer la réponse. Toute la
 * logique de sélection vit dans `product.service.ts`, et cette route ne sait
 * pas ce qu'est un produit pertinent.
 */
export async function GET(request: NextRequest) {
  return handleRoute("GET /api/products", async () => {
    const query = parseQuery(productQuerySchema, new URL(request.url));

    const result = await productService.search({
      ...(query.q === undefined ? {} : { q: query.q }),
      ...(query.category === undefined ? {} : { category: query.category }),
      ...(query.minPrice === undefined ? {} : { minPriceCents: query.minPrice }),
      ...(query.maxPrice === undefined ? {} : { maxPriceCents: query.maxPrice }),
      ...(query.inStock === undefined ? {} : { inStockOnly: query.inStock === "true" }),
      ...(query.sort === undefined ? {} : { sort: query.sort }),
      ...(query.page === undefined ? {} : { page: query.page }),
      ...(query.pageSize === undefined ? {} : { pageSize: query.pageSize }),
    });

    return ok(result);
  });
}
