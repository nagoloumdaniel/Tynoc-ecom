import { describe, expect, it } from "vitest";

import {
  AppError,
  ConflictError,
  DatabaseError,
  NotFoundError,
  ValidationError,
  isAppError,
  toAppError,
} from "@/lib/errors";

/**
 * Hiérarchie d'erreurs applicatives (P4.9, avancée ici parce que P3.7 en
 * dépend : un repository doit avoir une erreur métier vers laquelle traduire
 * une erreur du SDK).
 *
 * La propriété centrale : **l'erreur porte son code et son statut**, l'appelant
 * ne les devine pas. Une route qui doit décider elle-même « ça, c'est un 404 »
 * finit toujours par se tromper quelque part.
 */

describe("AppError", () => {
  it("porte son code et son statut HTTP", () => {
    expect(new NotFoundError("Produit introuvable")).toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
    expect(new ValidationError("Quantité invalide")).toMatchObject({
      code: "VALIDATION",
      status: 400,
    });
    expect(new ConflictError("Déjà dans la liste")).toMatchObject({
      code: "CONFLICT",
      status: 409,
    });
    expect(new DatabaseError("Query a échoué")).toMatchObject({
      code: "DATABASE",
      status: 500,
    });
  });

  it("reste reconnaissable par instanceof après transpilation", () => {
    // Piège classique : sans restauration explicite du prototype, une classe
    // qui étend Error cesse de répondre à instanceof une fois transpilée.
    const error = new NotFoundError("absent");
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("NotFoundError");
  });

  it("distingue ce qui est montrable à l'utilisateur de ce qui ne l'est pas", () => {
    // Un message de validation aide l'utilisateur. Un message de base de
    // données lui parle de notre table et de notre requête (P15.30).
    expect(new NotFoundError("Ce produit n'existe plus").expose).toBe(true);
    expect(new ValidationError("Quantité maximale : 10").expose).toBe(true);
    expect(new ConflictError("Déjà dans vos favoris").expose).toBe(true);
    expect(new DatabaseError("Query on tynoc-ecom-dev failed").expose).toBe(false);
  });

  it("ne laisse jamais fuir le détail d'une erreur non exposable", () => {
    const error = new DatabaseError("ProvisionedThroughputExceeded sur GSI1");

    expect(error.publicMessage).not.toContain("GSI1");
    expect(error.publicMessage).not.toContain("ProvisionedThroughput");
    // Le détail reste disponible côté serveur, pour le log.
    expect(error.message).toContain("GSI1");
  });

  it("conserve la cause d'origine pour le diagnostic serveur", () => {
    const cause = new Error("socket hang up");
    const error = new DatabaseError("Lecture impossible", { cause });

    expect(error.cause).toBe(cause);
  });

  it("transporte les champs fautifs d'une erreur de validation", () => {
    const error = new ValidationError("Entrée invalide", {
      fields: { quantity: "Doit être comprise entre 1 et 10" },
    });

    expect(error.fields).toEqual({ quantity: "Doit être comprise entre 1 et 10" });
  });
});

describe("isAppError", () => {
  it("reconnaît les erreurs du domaine et rejette les autres", () => {
    expect(isAppError(new NotFoundError("x"))).toBe(true);
    expect(isAppError(new Error("x"))).toBe(false);
    expect(isAppError("pas une erreur")).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});

describe("toAppError", () => {
  it("laisse passer une erreur applicative sans la réemballer", () => {
    const original = new NotFoundError("Produit introuvable");
    expect(toAppError(original)).toBe(original);
  });

  it("emballe une erreur inconnue sans exposer son message", () => {
    const converted = toAppError(new Error("Connexion refusée vers 10.0.0.4:8000"));

    expect(converted).toBeInstanceOf(AppError);
    expect(converted.expose).toBe(false);
    expect(converted.publicMessage).not.toContain("10.0.0.4");
    expect(converted.cause).toBeInstanceOf(Error);
  });

  it("emballe une valeur lancée qui n'est même pas une erreur", () => {
    // `throw "oups"` est légal en JavaScript, et une couche de traduction qui
    // suppose un objet Error plante au pire moment.
    const converted = toAppError("oups");

    expect(converted).toBeInstanceOf(AppError);
    expect(converted.status).toBe(500);
  });
});
