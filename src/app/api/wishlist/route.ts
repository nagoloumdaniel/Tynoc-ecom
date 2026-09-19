import type { NextRequest } from "next/server";

import { handleRoute, noContent, ok, parseQuery, readJsonBody } from "@/lib/api";
import { deleteWishlistQuerySchema } from "@/schemas/api";
import { wishlistInputSchema } from "@/schemas/wishlist";
import { wishlistService } from "@/server/services";
import { getSessionUserId } from "@/server/session";

/**
 * Liste de souhaits (P5.6).
 *
 * Comme le panier, l'identité vient du cookie signé et jamais de la charge
 * utile.
 *
 * Point d'attention sur le code de retour : la roadmap prévoyait un 409 sur
 * doublon. Le service rend l'ajout **idempotent**, et c'est le bon choix
 * métier : ajouter deux fois un produit à ses favoris n'est pas une erreur
 * pour l'utilisateur. La route répond donc 200 avec `added: false` plutôt que
 * 409, ce qui décrit exactement ce qui s'est passé sans faire échouer une
 * action réussie du point de vue du visiteur.
 */

export async function GET() {
  return handleRoute("GET /api/wishlist", async () => {
    const userId = await getSessionUserId();
    return ok(await wishlistService.list(userId));
  });
}

export async function POST(request: NextRequest) {
  return handleRoute("POST /api/wishlist", async () => {
    const userId = await getSessionUserId();
    const { productId } = await readJsonBody(request, wishlistInputSchema);

    const { added } = await wishlistService.add(userId, productId);

    // 201 quand l'entrée vient d'être créée, 200 quand elle existait déjà.
    return ok({ added, items: await wishlistService.list(userId) }, added ? 201 : 200);
  });
}

export async function DELETE(request: NextRequest) {
  return handleRoute("DELETE /api/wishlist", async () => {
    const userId = await getSessionUserId();
    const { productId } = parseQuery(deleteWishlistQuerySchema, new URL(request.url));

    await wishlistService.remove(userId, productId);

    return noContent();
  });
}
