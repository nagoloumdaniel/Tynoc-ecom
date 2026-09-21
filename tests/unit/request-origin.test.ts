import { describe, expect, it } from "vitest";

import { isCrossOriginRequest } from "@/lib/request-origin";

/** Contrôle de provenance des écritures d'API (P12.3). */
describe("isCrossOriginRequest", () => {
  const host = "boutique.example";

  it("accepte une requête de la même origine", () => {
    expect(
      isCrossOriginRequest({ origin: "https://boutique.example", secFetchSite: null, host }),
    ).toBe(false);
  });

  it("refuse une autre origine", () => {
    expect(
      isCrossOriginRequest({ origin: "https://pirate.example", secFetchSite: null, host }),
    ).toBe(true);
  });

  it("refuse un sous-domaine, que SameSite=Lax laisserait passer", () => {
    expect(
      isCrossOriginRequest({ origin: "https://evil.boutique.example", secFetchSite: null, host }),
    ).toBe(true);
  });

  it("tient compte du port", () => {
    expect(
      isCrossOriginRequest({
        origin: "http://127.0.0.1:3100",
        secFetchSite: null,
        host: "127.0.0.1:3100",
      }),
    ).toBe(false);
    expect(
      isCrossOriginRequest({
        origin: "http://127.0.0.1:4000",
        secFetchSite: null,
        host: "127.0.0.1:3100",
      }),
    ).toBe(true);
  });

  it("refuse l'origine opaque `null` et une origine illisible", () => {
    expect(isCrossOriginRequest({ origin: "null", secFetchSite: null, host })).toBe(true);
    expect(isCrossOriginRequest({ origin: "pas une url", secFetchSite: null, host })).toBe(true);
  });

  it("se rabat sur Sec-Fetch-Site sans en-tête Origin", () => {
    expect(isCrossOriginRequest({ origin: null, secFetchSite: "cross-site", host })).toBe(true);
    expect(isCrossOriginRequest({ origin: null, secFetchSite: "same-origin", host })).toBe(false);
  });

  it("laisse passer un client qui n'est pas un navigateur", () => {
    // Sans navigateur, aucun cookie ambiant n'est joint à l'insu de personne.
    expect(isCrossOriginRequest({ origin: null, secFetchSite: null, host })).toBe(false);
  });
});
