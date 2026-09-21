import { NextResponse, type NextRequest } from "next/server";

import { env, isProduction } from "@/lib/env";
import {
  newSessionId,
  sessionCookieName,
  sessionCookieOptions,
  shouldRefreshSession,
  signSession,
  verifySession,
} from "@/lib/session";

/**
 * Attribution de la session (P5.8).
 *
 * **`proxy.ts` et non `middleware.ts`** : le fichier `middleware` est déprécié
 * en Next.js 16 et renommé `proxy`. La fonction exportée doit s'appeler `proxy`
 * ou être l'export par défaut.
 *
 * Pourquoi ici et pas dans une page : un Server Component **ne peut pas poser
 * de cookie**. Le serveur n'émet que des instructions `Set-Cookie`, et ces
 * en-têtes doivent partir avant le début du flux de rendu. Seuls un Route
 * Handler, une Server Function ou ce fichier peuvent le faire. Un premier
 * visiteur qui arrive directement sur une page produit doit pourtant repartir
 * avec une session : c'est donc ici, avant tout rendu.
 *
 * Le cookie est posé deux fois, et les deux comptent :
 *
 * - sur la **requête**, pour que le rendu en cours voie déjà la session au lieu
 *   d'attendre la requête suivante ;
 * - sur la **réponse**, pour que le navigateur la conserve.
 *
 * Depuis Next.js 16, Proxy s'exécute sur le runtime Node.js par défaut, ce qui
 * rend `node:crypto` disponible et permet de partager exactement le même code
 * de signature qu'ailleurs dans l'application.
 */
export function proxy(request: NextRequest): NextResponse {
  const cookieName = sessionCookieName(isProduction);
  const existing = request.cookies.get(cookieName)?.value;

  if (existing !== undefined && verifySession(env.SESSION_SECRET, existing) !== null) {
    // Un cookie valide n'est réécrit que sur une écriture, pour repousser son
    // expiration au même rythme que le TTL des données en base. En lecture,
    // il est laissé tel quel : un `Set-Cookie` sur chaque réponse du site ne
    // rapporterait rien.
    if (!shouldRefreshSession(request.method)) return NextResponse.next();

    const response = NextResponse.next();
    response.cookies.set(cookieName, existing, sessionCookieOptions(isProduction));
    return response;
  }

  // Couvre les trois cas d'un coup : aucun cookie, cookie expiré, cookie
  // falsifié. Dans tous, la bonne réponse est la même, une session neuve.
  const token = signSession(env.SESSION_SECRET, newSessionId());

  request.cookies.set(cookieName, token);
  const response = NextResponse.next({ request });
  response.cookies.set(cookieName, token, sessionCookieOptions(isProduction));

  return response;
}

export const config = {
  /**
   * Sans `matcher`, Proxy tourne sur **chaque** requête, y compris les fichiers
   * statiques et les images optimisées. Le motif négatif les écarte : signer un
   * cookie pour livrer une feuille de style est du travail perdu sur chaque
   * ressource de chaque page.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
