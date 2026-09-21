import { describe, expect, it } from "vitest";

import {
  SESSION_MAX_AGE_SECONDS,
  newSessionId,
  sessionCookieName,
  sessionCookieOptions,
  shouldRefreshSession,
  signSession,
  verifySession,
} from "@/lib/session";

/**
 * Cookie de session (P5.8, P15.4 à P15.6).
 *
 * Le cookie porte l'identité de l'utilisateur pour tout le reste de
 * l'application. S'il est falsifiable, alors la dérivation serveur de
 * l'identité (P15.1) ne vaut rien : il suffirait d'écrire l'identifiant d'un
 * autre dans son propre navigateur pour lire son panier.
 *
 * La cryptographie est volontairement pure, le secret est un paramètre : elle
 * se teste donc sans configuration d'environnement.
 */

const SECRET = "secret-de-test-suffisamment-long-pour-etre-credible";
const OTHER_SECRET = "un-autre-secret-tout-aussi-long-que-le-premier-la";

describe("newSessionId", () => {
  it("produit un identifiant non devinable", () => {
    // Un compteur ou un horodatage permettrait de deviner la session du
    // visiteur précédent. `randomUUID` apporte 122 bits d'aléa.
    const ids = new Set(Array.from({ length: 200 }, () => newSessionId()));

    expect(ids.size).toBe(200);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});

describe("signSession et verifySession", () => {
  it("relit l'identifiant qu'il a signé", () => {
    const id = newSessionId();
    expect(verifySession(SECRET, signSession(SECRET, id))).toBe(id);
  });

  it("rejette un identifiant modifié", () => {
    // Le cas qui compte : quelqu'un remplace l'identifiant par celui d'un
    // autre en gardant la signature.
    const mine = newSessionId();
    const victim = newSessionId();
    const token = signSession(SECRET, mine);
    const signature = token.slice(token.indexOf("."));

    expect(verifySession(SECRET, `${victim}${signature}`)).toBeNull();
  });

  it("rejette une signature modifiée", () => {
    const token = signSession(SECRET, newSessionId());
    const forged = `${token.slice(0, -1)}${token.at(-1) === "a" ? "b" : "a"}`;

    expect(verifySession(SECRET, forged)).toBeNull();
  });

  it("rejette un jeton signé avec un autre secret", () => {
    const token = signSession(OTHER_SECRET, newSessionId());
    expect(verifySession(SECRET, token)).toBeNull();
  });

  it("rejette un jeton sans signature", () => {
    expect(verifySession(SECRET, newSessionId())).toBeNull();
  });

  it("rejette une valeur absente, vide ou absurde", () => {
    expect(verifySession(SECRET, undefined)).toBeNull();
    expect(verifySession(SECRET, "")).toBeNull();
    expect(verifySession(SECRET, ".")).toBeNull();
    expect(verifySession(SECRET, "pas-un-uuid.signature")).toBeNull();
  });

  it("rejette un identifiant qui n'est pas un UUID, même correctement signé", () => {
    // Sans ce contrôle, un identifiant arbitraire signé par un jeton volé
    // deviendrait une clé de partition arbitraire dans la base.
    const token = signSession(SECRET, "../../admin");
    expect(verifySession(SECRET, token)).toBeNull();
  });

  it("produit une signature stable pour un même identifiant", () => {
    const id = newSessionId();
    expect(signSession(SECRET, id)).toBe(signSession(SECRET, id));
  });

  it("produit une valeur transportable dans un cookie", () => {
    const token = signSession(SECRET, newSessionId());

    // Ni point-virgule, ni virgule, ni espace : rien qui casse un en-tête.
    expect(token).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(encodeURIComponent(token)).toBe(token);
  });
});

describe("cookie", () => {
  it("utilise le préfixe __Host- en production", () => {
    // `__Host-` impose au navigateur Secure, Path=/ et l'absence de Domain :
    // un sous-domaine compromis ne peut plus écrire le cookie du site.
    expect(sessionCookieName(true)).toBe("__Host-tynoc_session");
  });

  it("se passe du préfixe en développement", () => {
    // `__Host-` exige Secure, que http://localhost ne fournit pas : garder le
    // préfixe en développement rendrait la session inutilisable en local.
    expect(sessionCookieName(false)).not.toContain("__Host-");
  });

  it("durcit le cookie en production", () => {
    const options = sessionCookieOptions(true);

    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  });

  it("garde httpOnly même en développement", () => {
    // `secure` tombe en local faute de HTTPS, mais aucune raison d'exposer le
    // cookie au JavaScript de la page pour autant.
    const options = sessionCookieOptions(false);

    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe("lax");
  });

  it("annonce une durée de vie explicite", () => {
    // Sans `maxAge`, le cookie est un cookie de session au sens du navigateur
    // et disparaît à la fermeture : le panier ne survivrait pas à la visite.
    expect(SESSION_MAX_AGE_SECONDS).toBeGreaterThan(0);
  });
});

describe("shouldRefreshSession", () => {
  // Le cookie doit vivre aussi longtemps que les données qu'il désigne, dont
  // le TTL repart à chaque écriture.
  it.each(["POST", "PUT", "PATCH", "DELETE", "post"])("renouvelle sur %s", (method) => {
    expect(shouldRefreshSession(method)).toBe(true);
  });

  it.each(["GET", "HEAD", "OPTIONS", "get"])("ne renouvelle pas sur %s", (method) => {
    expect(shouldRefreshSession(method)).toBe(false);
  });
});
