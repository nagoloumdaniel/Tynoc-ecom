import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { SESSION_TTL_DAYS } from "./limits";

/**
 * Cookie de session (P5.8, et P15.4 à P15.6 pour son durcissement).
 *
 * Le brief demande la gestion des données utilisateur, pas une
 * authentification. L'identité est donc un UUID tiré côté serveur, déposé dans
 * un cookie et signé.
 *
 * Pourquoi le signer, puisqu'il ne donne accès à aucun compte : parce que tout
 * le reste du code dérive l'identité de ce cookie (P15.1). Sans signature, il
 * suffirait d'écrire l'identifiant d'un autre dans son propre navigateur pour
 * lire son panier. La signature transforme le cookie en capacité vérifiable
 * plutôt qu'en simple étiquette.
 *
 * Ce module est **pur** : le secret est un paramètre, jamais lu ici. Il se
 * teste donc sans configuration d'environnement, et il reste utilisable aussi
 * bien depuis `proxy.ts` que depuis un Route Handler.
 */

/** Séparateur entre la charge utile et sa signature. */
const SEPARATOR = ".";

/** Un UUID v4, et rien d'autre, ne peut devenir une clé de partition. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Durée de vie du cookie, alignée sur le TTL des items de session. */
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
}

/**
 * Nom du cookie.
 *
 * En production, le préfixe `__Host-` est imposé par le navigateur lui-même :
 * il refuse le cookie s'il n'est pas `Secure`, s'il porte un `Domain` ou si son
 * `Path` n'est pas `/`. Conséquence directe : un sous-domaine compromis ne peut
 * plus écrire la session du site.
 *
 * En développement, `http://localhost` ne fournit pas `Secure`, donc le
 * préfixe rendrait la session inutilisable en local.
 */
export function sessionCookieName(isProduction: boolean): string {
  return isProduction ? "__Host-tynoc_session" : "tynoc_session";
}

export function sessionCookieOptions(isProduction: boolean): SessionCookieOptions {
  return {
    // Inaccessible au JavaScript de la page, en production comme en local :
    // aucune raison d'exposer l'identité de session à un script tiers.
    httpOnly: true,
    secure: isProduction,
    // `lax` laisse passer la navigation entrante normale tout en bloquant les
    // requêtes croisées de mutation. La vérification d'origine viendra en
    // complément (P15.17), jamais en remplacement.
    sameSite: "lax",
    path: "/",
    // Sans durée explicite, le navigateur en fait un cookie de session et le
    // panier ne survivrait pas à la fermeture de l'onglet.
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/** Identifiant de session : 122 bits d'aléa cryptographique, aucun compteur. */
export function newSessionId(): string {
  return randomUUID();
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signSession(secret: string, userId: string): string {
  return `${userId}${SEPARATOR}${sign(secret, userId)}`;
}

/**
 * Relit un cookie et retourne l'identifiant, ou `null` si quoi que ce soit
 * cloche.
 *
 * Toujours `null`, jamais une exception : un cookie invalide est le cas normal
 * d'un visiteur dont la signature a expiré ou qui arrive avec un résidu. Le
 * proxy en refait simplement un neuf.
 */
export function verifySession(secret: string, token: string | undefined): string | null {
  if (!token) return null;

  const separator = token.lastIndexOf(SEPARATOR);
  if (separator <= 0) return null;

  const userId = token.slice(0, separator);
  const provided = token.slice(separator + 1);

  // Contrôle de forme avant tout calcul : un identifiant arbitraire, même
  // correctement signé avec un secret fuité, ne doit pas pouvoir devenir une
  // clé de partition arbitraire.
  if (!UUID_V4.test(userId)) return null;

  const expected = sign(secret, userId);

  // Comparaison à temps constant. Une comparaison naïve fuit, par sa durée, le
  // nombre d'octets corrects, ce qui permet de reconstituer une signature
  // valide octet par octet.
  const providedBytes = Buffer.from(provided, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  if (providedBytes.length !== expectedBytes.length) return null;
  if (!timingSafeEqual(providedBytes, expectedBytes)) return null;

  return userId;
}

/** Méthodes qui ne modifient rien : elles ne renouvellent pas la session. */
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Faut-il renouveler un cookie **valide** sur cette requête ?
 *
 * Le jeton ne porte aucune date : c'est la `maxAge` du navigateur qui le fait
 * expirer. Posé une seule fois, il mourait 90 jours après la première visite,
 * alors que les données en base repartent pour 90 jours à chaque écriture. Un
 * visiteur actif perdait donc panier et favoris au 90e jour, sur une session
 * dont les données étaient bien vivantes (trouvé en revue, P12.1).
 *
 * Le renouvellement suit exactement le renouvellement des données : sur les
 * requêtes d'écriture, qui sont celles qui repoussent le TTL en base. Server
 * Actions comprises, puisqu'elles arrivent en `POST`. La navigation en lecture
 * continue de ne coûter aucun en-tête `Set-Cookie`.
 */
export function shouldRefreshSession(method: string): boolean {
  return !READ_METHODS.has(method.toUpperCase());
}
