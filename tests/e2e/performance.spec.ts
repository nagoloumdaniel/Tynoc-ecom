import { expect, test, type Page } from "@playwright/test";

/**
 * Mesures de performance et de prérendu (P10.2, P10.7).
 *
 * L'audit Lighthouse de P10.7 attendait un navigateur. Plutôt que de rapporter
 * un score composite, ces tests mesurent directement ce que la roadmap vise :
 * le LCP, l'absence de décalage de mise en page, et la réalité du prérendu.
 *
 * Un score Lighthouse dépend de la machine qui le calcule. Les valeurs
 * mesurées ici, elles, se comparent d'une exécution à l'autre, ce qui est
 * précisément ce qu'on veut d'un test de non-régression.
 *
 * Ces tests tournent contre le build de production. En développement, Next ne
 * prérend pas et ne sert pas les images optimisées : la mesure n'aurait aucun
 * sens.
 */

/** Plus grande peinture de contenu, en millisecondes. */
async function measureLcp(page: Page, path: string): Promise<number> {
  await page.goto(path);

  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let last = 0;

        new PerformanceObserver((entries) => {
          for (const entry of entries.getEntries()) last = entry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });

        // Le LCP se stabilise après le chargement ; on laisse le temps aux
        // images de se peindre avant de relever la dernière valeur.
        setTimeout(() => resolve(last), 2500);
      }),
  );
}

test.describe("chargement", () => {
  for (const path of ["/", "/products", "/products/sennheiser-hd-660s2"]) {
    test(`le LCP reste sous 2,5 s sur ${path}`, async ({ page }) => {
      const lcp = await measureLcp(page, path);

      // Seuil « bon » des Core Web Vitals. Mesuré en local, donc sans latence
      // réseau : c'est un plancher, pas une garantie de terrain.
      expect(lcp, `LCP de ${path}`).toBeLessThan(2500);
    });
  }

  test("aucun décalage de mise en page cumulé notable", async ({ page }) => {
    await page.goto("/products");

    const cls = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0;

          new PerformanceObserver((entries) => {
            for (const entry of entries.getEntries()) {
              const shift = entry as PerformanceEntry & {
                value: number;
                hadRecentInput: boolean;
              };
              // Un décalage consécutif à une action de l'utilisateur est
              // attendu et ne compte pas.
              if (!shift.hadRecentInput) total += shift.value;
            }
          }).observe({ type: "layout-shift", buffered: true });

          setTimeout(() => resolve(total), 2500);
        }),
    );

    // Seuil « bon » des Core Web Vitals. C'est ce que paient les squelettes
    // fidèles et les images à ratio fixe.
    expect(cls).toBeLessThan(0.1);
  });
});

test.describe("prérendu", () => {
  test("la coquille et la navigation arrivent sans JavaScript", async ({ browser }) => {
    // Ce que la coquille statique garantit réellement : l'ossature du site et
    // les liens sont là avant toute exécution de script.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/products");

    // L'en-tête, le pied de page et le lien d'évitement sont dans la coquille
    // statique : ils n'attendent aucun script. Le contenu de cette route,
    // lui, arrive en flux, ce que le test suivant explicite.
    // Par rôle, et non par balise : `<header>` sert aussi de titre de section
    // à l'intérieur de `main`, où il n'est pas la bannière du site.
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeAttached();

    // La navigation par catégories, elle aussi dans la coquille. Le lien
    // « Tout le catalogue » n'y est pas : il vit dans le tiroir mobile, qui est
    // un `<dialog>` monté par un composant client. Sans script, il n'existe
    // pas, et c'est cohérent : sans script il n'y a pas non plus de bouton
    // pour l'ouvrir.
    await expect(
      page.getByRole("navigation", { name: "Catégories" }).getByRole("link", { name: "Casques" }),
    ).toBeAttached();

    await context.close();
  });

  test("l'accueil rend ses produits sans JavaScript", async ({ browser }) => {
    // Mesuré, et la nuance compte : l'accueil n'a pas de `loading.tsx`, donc
    // son contenu part dans la coquille statique. Les routes qui en ont un
    // diffusent le leur en flux, et le remplacement du squelette par le
    // contenu réel est opéré par les scripts de React.
    //
    // Autrement dit, la coquille tient sans script, le contenu différé non.
    // C'est une propriété du rendu en flux, pas un défaut de cette
    // application, mais elle mérite d'être vérifiée plutôt que supposée.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/");

    await expect(page.locator("main article").first()).toBeVisible();
    expect(await page.locator("main article").count()).toBeGreaterThan(4);

    await context.close();
  });

  test("les images sont servies dans un format moderne", async ({ page }) => {
    const formats: string[] = [];

    page.on("response", (response) => {
      if (response.request().resourceType() === "image") {
        const type = response.headers()["content-type"];
        if (type) formats.push(type);
      }
    });

    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    expect(formats.length).toBeGreaterThan(0);
    expect(formats.some((type) => type.includes("avif") || type.includes("webp"))).toBe(true);
  });
});
