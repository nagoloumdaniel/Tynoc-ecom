import { describe, expect, it } from "vitest";

import { MAX_REQUEST_BODY_BYTES, errorToApiPayload, parseQuery, readJsonBody } from "@/lib/api";
import { ConflictError, DatabaseError, NotFoundError, ValidationError } from "@/lib/errors";
import { z } from "zod";

/**
 * Enveloppe d'API et traitement centralisé des erreurs (P5.1, P5.9, P5.10).
 *
 * Deux exigences se rejoignent ici. D'abord la cohérence : toutes les routes
 * ont la même forme de réponse, y compris en échec, faute de quoi le client
 * doit connaître chaque endpoint. Ensuite la sécurité : aucune trace, aucun nom
 * de table et aucun détail interne ne doit franchir la frontière HTTP.
 */

describe("errorToApiPayload", () => {
  it("traduit chaque erreur du domaine en statut HTTP", () => {
    expect(errorToApiPayload(new NotFoundError("absent"), "req-1").status).toBe(404);
    expect(errorToApiPayload(new ValidationError("invalide"), "req-1").status).toBe(400);
    expect(errorToApiPayload(new ConflictError("doublon"), "req-1").status).toBe(409);
    expect(errorToApiPayload(new DatabaseError("Query a échoué"), "req-1").status).toBe(500);
  });

  it("transporte le message quand il est destiné à l'utilisateur", () => {
    const { body } = errorToApiPayload(new NotFoundError("Ce produit n'existe plus."), "req-1");

    expect(body).toMatchObject({
      success: false,
      error: { code: "NOT_FOUND", message: "Ce produit n'existe plus." },
    });
  });

  it("remplace le message d'une panne interne par un message générique", () => {
    const { body } = errorToApiPayload(
      new DatabaseError("Throughput exceeded on table tynoc-ecom-prod index GSI1"),
      "req-1",
    );

    expect(body.error.message).not.toContain("tynoc-ecom-prod");
    expect(body.error.message).not.toContain("GSI1");
  });

  it("n'expose jamais de trace d'appels", () => {
    const { body } = errorToApiPayload(new Error("boom"), "req-1");

    expect(JSON.stringify(body)).not.toContain("stack");
    expect(JSON.stringify(body)).not.toContain("boom");
  });

  it("joint un identifiant de requête pour rapprocher log et incident", () => {
    // L'utilisateur voit un message générique. L'identifiant est ce qui permet
    // de retrouver la cause exacte dans les logs serveur.
    const { body } = errorToApiPayload(new DatabaseError("interne"), "req-42");

    expect(body.error.requestId).toBe("req-42");
  });

  it("transporte les champs fautifs d'une erreur de validation", () => {
    const error = new ValidationError("Entrée invalide", {
      fields: { quantity: "Entre 1 et 10" },
    });

    expect(errorToApiPayload(error, "req-1").body.error.fields).toEqual({
      quantity: "Entre 1 et 10",
    });
  });

  it("traite une valeur lancée qui n'est pas une erreur", () => {
    expect(errorToApiPayload("oups", "req-1").status).toBe(500);
  });
});

describe("parseQuery", () => {
  const schema = z.object({
    q: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
  });

  it("lit et convertit les paramètres d'URL", () => {
    const url = new URL("https://tynoc.test/api/products?q=casque&page=3");

    expect(parseQuery(schema, url)).toEqual({ q: "casque", page: 3 });
  });

  it("refuse un paramètre invalide par une erreur exposable", () => {
    const url = new URL("https://tynoc.test/api/products?page=zero");

    expect(() => parseQuery(schema, url)).toThrow(ValidationError);
  });

  it("indique quel paramètre est en cause", () => {
    const url = new URL("https://tynoc.test/api/products?page=-4");

    try {
      parseQuery(schema, url);
      expect.unreachable("la validation aurait dû échouer");
    } catch (error) {
      expect((error as ValidationError).fields).toHaveProperty("page");
    }
  });
});

describe("readJsonBody", () => {
  const schema = z.strictObject({ productId: z.string(), quantity: z.number() });

  function request(body: unknown, headers: Record<string, string> = {}): Request {
    const payload = JSON.stringify(body);
    return new Request("https://tynoc.test/api/cart", {
      method: "POST",
      body: payload,
      headers: { "content-type": "application/json", ...headers },
    });
  }

  it("lit et valide un corps conforme", async () => {
    await expect(
      readJsonBody(request({ productId: "prd_a", quantity: 2 }), schema),
    ).resolves.toEqual({ productId: "prd_a", quantity: 2 });
  });

  it("refuse un corps qui ne correspond pas au schéma", async () => {
    await expect(readJsonBody(request({ productId: "prd_a" }), schema)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("refuse un champ inconnu plutôt que de l'ignorer", async () => {
    // `strictObject` : un champ en trop signale soit un bug d'appelant, soit
    // une tentative de faire passer un paramètre non prévu, par exemple un
    // `userId` (P15.7).
    await expect(
      readJsonBody(request({ productId: "prd_a", quantity: 1, userId: "autrui" }), schema),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuse un corps qui n'est pas du JSON", async () => {
    const bad = new Request("https://tynoc.test/api/cart", {
      method: "POST",
      body: "pas du json",
      headers: { "content-type": "application/json" },
    });

    await expect(readJsonBody(bad, schema)).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuse un corps annoncé trop gros avant de le lire", async () => {
    // Le contrôle porte sur l'en-tête, donc avant d'avoir alloué quoi que ce
    // soit : un corps de 10 Mo est rejeté sans être chargé en mémoire (P15.21).
    const oversized = request(
      { productId: "prd_a", quantity: 1 },
      { "content-length": String(MAX_REQUEST_BODY_BYTES + 1) },
    );

    await expect(readJsonBody(oversized, schema)).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuse un corps réellement trop gros même sans en-tête de taille", async () => {
    const huge = new Request("https://tynoc.test/api/cart", {
      method: "POST",
      body: JSON.stringify({ productId: "x".repeat(MAX_REQUEST_BODY_BYTES + 100), quantity: 1 }),
      headers: { "content-type": "application/json" },
    });

    await expect(readJsonBody(huge, schema)).rejects.toBeInstanceOf(ValidationError);
  });
});
