import { describe, expect, it } from "vitest";

import { ConflictError, DatabaseError, NotFoundError } from "@/lib/errors";
import { translateDynamoError, withDynamoErrors } from "@/server/repositories/dynamo-errors";

/**
 * Traduction des erreurs du SDK AWS (P3.7).
 *
 * Règle du projet : **aucune erreur AWS brute ne remonte à l'UI**. Deux raisons
 * qui n'ont rien à voir l'une avec l'autre.
 *
 * La première est fonctionnelle : `ConditionalCheckFailedException` veut dire
 * « ce produit est déjà dans la liste », ce qui est un 409 et un message clair.
 * Laissée brute, elle devient un 500 et un écran d'erreur.
 *
 * La seconde est de sécurité : le message d'une erreur AWS contient le nom de
 * la table, celui de l'index, parfois un fragment d'expression (P15.30).
 */

/** Reproduit la forme d'une erreur du SDK v3 : le type est porté par `name`. */
function awsError(name: string, message = "message interne AWS"): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe("translateDynamoError", () => {
  it("traduit un échec de condition en conflit métier", () => {
    const translated = translateDynamoError(
      awsError("ConditionalCheckFailedException"),
      "ajout à la liste de souhaits",
    );

    expect(translated).toBeInstanceOf(ConflictError);
    expect(translated.status).toBe(409);
  });

  it("traduit une transaction annulée en conflit", () => {
    const translated = translateDynamoError(
      awsError("TransactionCanceledException"),
      "déplacement vers le panier",
    );

    expect(translated).toBeInstanceOf(ConflictError);
  });

  it("traite une table absente comme une panne serveur", () => {
    // Une table manquante est un défaut de configuration, jamais la faute de
    // l'utilisateur : ni 404 ni 400.
    const translated = translateDynamoError(awsError("ResourceNotFoundException"), "lecture");

    expect(translated).toBeInstanceOf(DatabaseError);
    expect(translated).not.toBeInstanceOf(NotFoundError);
    expect(translated.status).toBe(500);
  });

  it("traite un débit dépassé comme une panne serveur", () => {
    expect(
      translateDynamoError(awsError("ProvisionedThroughputExceededException"), "listing"),
    ).toBeInstanceOf(DatabaseError);
    expect(translateDynamoError(awsError("ThrottlingException"), "listing")).toBeInstanceOf(
      DatabaseError,
    );
  });

  it("traite une requête malformée comme notre faute, pas celle du client", () => {
    // `ValidationException` côté AWS signifie que *notre* expression est
    // fausse. La traduire en 400 accuserait l'utilisateur d'un bug interne.
    const translated = translateDynamoError(awsError("ValidationException"), "écriture");

    expect(translated).toBeInstanceOf(DatabaseError);
    expect(translated.status).toBe(500);
  });

  it("n'expose jamais le message d'origine ni le contexte technique", () => {
    const translated = translateDynamoError(
      awsError("ThrottlingException", "Throughput exceeded for table tynoc-ecom-prod index GSI1"),
      "listing du catalogue",
    );

    expect(translated.publicMessage).not.toContain("tynoc-ecom-prod");
    expect(translated.publicMessage).not.toContain("GSI1");
    // Le contexte reste côté serveur : c'est lui qui rend un log exploitable.
    expect(translated.message).toContain("listing du catalogue");
  });

  it("conserve l'erreur d'origine comme cause", () => {
    const original = awsError("ThrottlingException");
    expect(translateDynamoError(original, "listing").cause).toBe(original);
  });

  it("laisse passer une erreur applicative sans la retraduire", () => {
    // Un `NotFoundError` levé par le repository lui-même ne doit pas être
    // transformé en panne de base par la couche de traduction.
    const original = new NotFoundError("Produit introuvable");

    expect(translateDynamoError(original, "lecture produit")).toBe(original);
  });

  it("emballe une valeur inconnue plutôt que de la laisser filer", () => {
    expect(translateDynamoError("oups", "lecture")).toBeInstanceOf(DatabaseError);
  });
});

describe("withDynamoErrors", () => {
  it("retourne la valeur quand l'opération réussit", async () => {
    await expect(withDynamoErrors("lecture", async () => 42)).resolves.toBe(42);
  });

  it("traduit l'erreur levée par l'opération", async () => {
    const failing = withDynamoErrors("ajout à la liste de souhaits", () => {
      throw awsError("ConditionalCheckFailedException");
    });

    await expect(failing).rejects.toBeInstanceOf(ConflictError);
  });

  it("traduit aussi un rejet asynchrone", async () => {
    const failing = withDynamoErrors("listing", async () => {
      await Promise.resolve();
      throw awsError("ThrottlingException");
    });

    await expect(failing).rejects.toBeInstanceOf(DatabaseError);
  });
});
