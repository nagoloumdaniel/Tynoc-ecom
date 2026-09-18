import { SESSION_TTL_DAYS } from "./limits";

/**
 * Échéance d'expiration des items de session (P16.7).
 *
 * Le RGPD demande de ne pas conserver une donnée au-delà de son utilité
 * (art. 5.1.e). Un panier abandonné depuis trois mois n'en a plus aucune. Le
 * TTL natif de DynamoDB s'en charge, sans tâche planifiée ni code à maintenir.
 *
 * Deux détails qui échouent en silence si on les rate :
 *
 * - DynamoDB attend des **secondes** depuis l'époque Unix. Passer des
 *   millisecondes place l'échéance en l'an 57 000 : rien n'est jamais purgé, et
 *   la conformité devient déclarative au lieu d'être réelle.
 * - La valeur doit être un **entier**, sinon l'écriture est rejetée.
 *
 * La fonction est rappelée à chaque écriture d'un item de session, ce qui
 * repousse l'échéance : un panier utilisé n'expire jamais sous son
 * propriétaire.
 */
const SECONDS_PER_DAY = 24 * 60 * 60;

export function sessionExpiresAt(from: Date = new Date()): number {
  return Math.floor(from.getTime() / 1000) + SESSION_TTL_DAYS * SECONDS_PER_DAY;
}
