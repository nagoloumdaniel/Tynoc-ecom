import type { NextRequest } from "next/server";

import { handleRoute, ok } from "@/lib/api";
import { productService } from "@/server/services";

/**
 * `GET /api/products/[slug]` (P5.3).
 *
 * La roadmap parlait d'un accès par identifiant. Le slug est retenu à la place,
 * pour une raison simple : c'est ce que porte l'URL des pages, donc ce qu'un
 * client a réellement sous la main. L'accès par identifiant existe au niveau du
 * repository, là où il sert (jointure du panier).
 *
 * Un slug inconnu remonte en `NotFoundError` depuis le service, que le
 * traitement centralisé transforme en 404 structuré. La route n'a rien à
 * décider.
 *
 * `RouteContext` est le type global généré par Next 16, et `params` y est une
 * promesse : elle doit être attendue.
 */
export async function GET(_request: NextRequest, context: RouteContext<"/api/products/[slug]">) {
  return handleRoute("GET /api/products/[slug]", async () => {
    const { slug } = await context.params;
    const product = await productService.getBySlug(slug);

    return ok(product);
  });
}
