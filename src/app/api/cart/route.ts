import type { NextRequest } from "next/server";

import { handleRoute, noContent, ok, parseQuery, readJsonBody } from "@/lib/api";
import { deleteCartQuerySchema } from "@/schemas/api";
import { addToCartInputSchema, updateCartQuantityInputSchema } from "@/schemas/cart";
import { cartService } from "@/server/services";
import { getSessionUserId } from "@/server/session";

/**
 * CRUD du panier (P5.5).
 *
 * **Aucune de ces routes n'accepte un identifiant d'utilisateur.** Il est
 * dérivé du cookie signé par `getSessionUserId`, et les schémas de corps sont
 * des `strictObject` : un `userId` glissé dans la charge utile est refusé en
 * 400, pas ignoré (P15.1, P15.7). C'est ce qui rend l'IDOR structurellement
 * impossible plutôt que corrigé route par route.
 *
 * Les mutations renvoient le récapitulatif complet : le client obtient le
 * nouveau total et le nouveau compteur sans second aller-retour, et le total
 * reste calculé côté serveur.
 */

export async function GET() {
  return handleRoute("GET /api/cart", async () => {
    const userId = await getSessionUserId();
    return ok(await cartService.getSummary(userId));
  });
}

/** Ajoute un produit, ou incrémente la ligne existante. */
export async function POST(request: NextRequest) {
  return handleRoute("POST /api/cart", async () => {
    const userId = await getSessionUserId();
    const input = await readJsonBody(request, addToCartInputSchema);

    const { summary, adjusted } = await cartService.addItem(userId, input);

    // 201 : une ressource a été créée ou augmentée dans le panier. `adjusted`
    // dit à l'interface si la quantité appliquée diffère de celle demandée.
    return ok({ ...summary, adjusted }, 201);
  });
}

/** Fixe la quantité d'une ligne existante. */
export async function PATCH(request: NextRequest) {
  return handleRoute("PATCH /api/cart", async () => {
    const userId = await getSessionUserId();
    const input = await readJsonBody(request, updateCartQuantityInputSchema);

    const { summary, adjusted } = await cartService.setQuantity(userId, input);

    return ok({ ...summary, adjusted });
  });
}

/**
 * Retire une ligne, ou vide le panier.
 *
 * Le produit passe par la query string et non par un corps de requête : un
 * corps sur un `DELETE` est mal pris en charge par une partie des clients HTTP
 * et des intermédiaires. Sans paramètre, l'opération vide le panier.
 */
export async function DELETE(request: NextRequest) {
  return handleRoute("DELETE /api/cart", async () => {
    const userId = await getSessionUserId();
    const query = parseQuery(deleteCartQuerySchema, new URL(request.url));

    if (query.productId === undefined) {
      await cartService.clear(userId);
      return noContent();
    }

    return ok(await cartService.removeItem(userId, query.productId));
  });
}
