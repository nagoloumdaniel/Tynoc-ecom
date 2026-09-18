import { ValidationError } from "./errors";

/**
 * Curseur de pagination (P3.8).
 *
 * DynamoDB ne sait pas sauter des éléments : il n'existe pas d'`OFFSET`. La
 * pagination se fait en réinjectant la `LastEvaluatedKey` de la page
 * précédente comme `ExclusiveStartKey` de la suivante.
 *
 * Cette clé est encodée en base64url avant de partir vers le client. Ce n'est
 * pas du chiffrement et ça ne prétend pas en être : c'est de l'opacité. Elle
 * évite d'exposer la structure des clés dans une URL et de donner envie de la
 * bricoler à la main. La sécurité, elle, vient du fait que toute clé décodée
 * est validée avant d'atteindre le SDK.
 */

/** Une `LastEvaluatedKey` DynamoDB : des noms d'attributs vers des chaînes. */
export type PageKey = Record<string, string>;

export function encodeCursor(key: PageKey): string {
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64url");
}

/**
 * Décode un curseur reçu du client.
 *
 * Échoue par `ValidationError` sur tout ce qui n'est pas une clé plausible :
 * chaîne tronquée, JSON valide mais de mauvaise forme, valeurs non textuelles.
 * Sans ce filtre, une entrée fabriquée traverserait jusqu'au SDK et
 * remonterait en erreur AWS brute, c'est-à-dire en 500 au lieu d'un 400.
 */
export function decodeCursor(cursor: string): PageKey {
  let parsed: unknown;

  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new ValidationError("Curseur de pagination invalide.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ValidationError("Curseur de pagination invalide.");
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) {
    throw new ValidationError("Curseur de pagination invalide.");
  }

  for (const [, value] of entries) {
    if (typeof value !== "string") {
      throw new ValidationError("Curseur de pagination invalide.");
    }
  }

  return Object.fromEntries(entries) as PageKey;
}
