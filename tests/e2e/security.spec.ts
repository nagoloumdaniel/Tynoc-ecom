import { expect, test } from "@playwright/test";

/**
 * Durcissement HTTP (P12.3).
 *
 * Le test le plus important de ce fichier est le premier. Une politique de
 * sécurité du contenu trop stricte ne lève aucune erreur côté serveur : elle
 * casse le site en silence, dans le navigateur. Seule une vraie page, rendue
 * et hydratée, peut prouver qu'elle ne bloque rien d'utile.
 */

const PAGES = [
  "/",
  "/products",
  "/categories/casques",
  "/products/sennheiser-hd-660s2",
  "/cart",
  "/wishlist",
];

test.describe("politique de sécurité du contenu", () => {
  for (const path of PAGES) {
    test(`aucune violation CSP sur ${path}`, async ({ page }) => {
      const violations: string[] = [];

      page.on("console", (message) => {
        if (/Content Security Policy|Refused to/i.test(message.text())) {
          violations.push(message.text());
        }
      });

      await page.goto(path);
      await page.waitForLoadState("networkidle");

      expect(violations).toEqual([]);
    });
  }

  test("une interaction complète fonctionne sous la politique", async ({ page }) => {
    // Hydratation, Server Action et notification : si la CSP bloquait un
    // script en flux, ce parcours serait le premier à le montrer.
    await page.goto("/products/beyerdynamic-dt-770-pro-80");
    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByText("Ajouté au panier")).toBeVisible();
  });
});

test.describe("en-têtes", () => {
  test("les en-têtes de sécurité sont posés", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();

    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});

test.describe("écritures d'API", () => {
  test("une écriture venue d'une autre origine est refusée", async ({ request }) => {
    const response = await request.post("/api/wishlist", {
      headers: { origin: "https://pirate.example", "content-type": "application/json" },
      data: { productId: "00000000-0000-4000-8000-000000000000" },
    });

    expect(response.status()).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
  });

  test("un corps qui n'est pas du JSON déclaré est refusé", async ({ request }) => {
    // Une « requête simple » intersite peut envoyer du text/plain sans
    // contrôle préalable : la route ne doit pas le lire.
    const response = await request.post("/api/wishlist", {
      headers: { "content-type": "text/plain" },
      data: JSON.stringify({ productId: "00000000-0000-4000-8000-000000000000" }),
    });

    expect(response.status()).toBe(415);
    expect((await response.json()).error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  test("la même écriture, de la bonne origine, passe", async ({ request, baseURL }) => {
    const response = await request.post("/api/wishlist", {
      headers: { origin: baseURL ?? "", "content-type": "application/json" },
      data: { productId: "00000000-0000-4000-8000-000000000000" },
    });

    // L'identifiant fictif est refusé par la validation (400). C'est la preuve
    // attendue : la requête a franchi le contrôle d'origine et celui du type
    // de contenu, et c'est la route elle-même qui répond.
    expect([403, 415]).not.toContain(response.status());
  });
});
