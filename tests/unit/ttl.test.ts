import { describe, expect, it } from "vitest";

import { SESSION_TTL_DAYS } from "@/lib/limits";
import { sessionExpiresAt } from "@/lib/ttl";

/**
 * Échéance TTL des items de session (P16.7).
 *
 * Deux pièges valent la peine d'être verrouillés par un test, parce qu'ils
 * échouent en silence :
 *
 * - DynamoDB attend des **secondes** depuis l'époque Unix. Passer des
 *   millisecondes place l'échéance en l'an 57 000 : rien n'est jamais purgé,
 *   et personne ne s'en aperçoit.
 * - La valeur doit être un **entier**. Un flottant est rejeté à l'écriture.
 */

const DAY_IN_SECONDS = 24 * 60 * 60;

describe("sessionExpiresAt", () => {
  it("compte en secondes depuis l'époque Unix, pas en millisecondes", () => {
    const now = new Date("2026-09-18T10:00:00.000Z");
    const expiry = sessionExpiresAt(now);

    expect(expiry).toBeLessThan(Date.now());
    expect(expiry).toBe(Math.floor(now.getTime() / 1000) + SESSION_TTL_DAYS * DAY_IN_SECONDS);
  });

  it("retourne un entier", () => {
    expect(Number.isInteger(sessionExpiresAt(new Date("2026-09-18T10:00:00.500Z")))).toBe(true);
  });

  it("repousse l'échéance à chaque appel plus tardif", () => {
    // C'est ce qui garantit qu'un panier actif n'expire jamais sous son
    // propriétaire : chaque interaction réécrit une échéance plus lointaine.
    const early = sessionExpiresAt(new Date("2026-09-18T10:00:00.000Z"));
    const later = sessionExpiresAt(new Date("2026-11-18T10:00:00.000Z"));

    expect(later).toBeGreaterThan(early);
  });

  it("place l'échéance à la durée d'inactivité annoncée", () => {
    const now = new Date("2026-09-18T10:00:00.000Z");
    const days = (sessionExpiresAt(now) - Math.floor(now.getTime() / 1000)) / DAY_IN_SECONDS;

    expect(days).toBe(SESSION_TTL_DAYS);
  });
});
