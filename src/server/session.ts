import "server-only";

import { cookies } from "next/headers";

import { env, isProduction } from "@/lib/env";
import { InternalError } from "@/lib/errors";
import { sessionCookieName, verifySession } from "@/lib/session";

/**
 * Lecture de l'identité de session côté serveur (P15.1).
 *
 * **C'est le seul endroit de l'application qui produit un identifiant
 * d'utilisateur.** Tout le reste, services comme repositories, le reçoit en
 * paramètre. Un `userId` venu d'un corps de requête, d'une query string ou d'un
 * champ de formulaire n'est jamais utilisé : la faille IDOR n'est pas corrigée
 * au cas par cas, elle est structurellement absente.
 *
 * Cette propriété se vérifie par `grep` : si `getSessionUserId` est la seule
 * source, aucun endpoint ne peut oublier le contrôle.
 */
export async function getSessionUserId(): Promise<string> {
  const store = await cookies();
  const token = store.get(sessionCookieName(isProduction))?.value;
  const userId = verifySession(env.SESSION_SECRET, token);

  if (userId === null) {
    // `proxy.ts` pose la session avant tout rendu et avant tout Route Handler.
    // Arriver ici signifie que le proxy n'a pas tourné sur ce chemin, ce qui
    // est un défaut de configuration de notre côté, pas une faute du visiteur.
    throw new InternalError("Session absente : le proxy n'a pas couvert cette route.");
  }

  return userId;
}

/**
 * Variante tolérante, pour les lectures qui peuvent se passer d'identité.
 *
 * Un compteur de panier dans l'en-tête affiche zéro plutôt que de faire
 * échouer la page entière.
 */
export async function getOptionalSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(sessionCookieName(isProduction))?.value;

  return verifySession(env.SESSION_SECRET, token);
}
