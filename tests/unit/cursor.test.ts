import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { ValidationError } from "@/lib/errors";

/**
 * Curseur de pagination (P3.8).
 *
 * DynamoDB ne sait pas sauter des éléments : il n'y a pas d'`OFFSET`. La
 * pagination se fait par `LastEvaluatedKey`, que l'on rend opaque avant de la
 * confier au client.
 *
 * Opaque, et pas seulement encodée : le client ne doit pas pouvoir fabriquer
 * une position arbitraire dans l'index, et la forme des clés ne doit pas
 * apparaître dans une URL.
 */

const KEY = {
  PK: "PRODUCT#prd_a1b2c3d4e5f6",
  SK: "META",
  GSI1PK: "PRODUCTS#ALL",
  GSI1SK: "CATEGORY#casques#PRICE#0000054900#prd_a1b2c3d4e5f6",
};

describe("encodeCursor", () => {
  it("restitue la clé d'origine à l'identique", () => {
    expect(decodeCursor(encodeCursor(KEY))).toEqual(KEY);
  });

  it("produit une chaîne utilisable telle quelle dans une URL", () => {
    const cursor = encodeCursor(KEY);

    // base64url : ni +, ni /, ni =, donc aucun encodage supplémentaire et
    // aucun risque de troncature dans une query string.
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encodeURIComponent(cursor)).toBe(cursor);
  });

  it("ne laisse pas la structure des clés en clair", () => {
    // Un simple JSON dans l'URL révélerait le schéma de clés et inviterait à
    // le bricoler à la main.
    expect(encodeCursor(KEY)).not.toContain("PRODUCT#");
    expect(encodeCursor(KEY)).not.toContain("GSI1");
  });
});

describe("decodeCursor", () => {
  it("rejette une chaîne qui n'est pas un curseur", () => {
    expect(() => decodeCursor("pas-un-curseur")).toThrow(ValidationError);
  });

  it("rejette un curseur tronqué plutôt que de deviner", () => {
    const cursor = encodeCursor(KEY);
    expect(() => decodeCursor(cursor.slice(0, 8))).toThrow(ValidationError);
  });

  it("rejette un contenu valide en base64 mais qui n'est pas une clé", () => {
    const forged = Buffer.from(JSON.stringify(["pas", "un", "objet"])).toString("base64url");
    expect(() => decodeCursor(forged)).toThrow(ValidationError);
  });

  it("rejette une clé dont les valeurs ne sont pas des chaînes", () => {
    // DynamoDB n'accepterait pas cette ExclusiveStartKey, et l'erreur
    // remonterait du SDK au lieu d'être attrapée à la frontière.
    const forged = Buffer.from(JSON.stringify({ PK: { nested: true } })).toString("base64url");
    expect(() => decodeCursor(forged)).toThrow(ValidationError);
  });

  it("rejette une clé vide", () => {
    const forged = Buffer.from(JSON.stringify({})).toString("base64url");
    expect(() => decodeCursor(forged)).toThrow(ValidationError);
  });

  it("échoue avec une erreur exposable et sans détail interne", () => {
    try {
      decodeCursor("pas-un-curseur");
      expect.unreachable("le décodage aurait dû échouer");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).status).toBe(400);
    }
  });
});
