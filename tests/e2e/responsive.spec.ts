import { expect, test, type Page } from "@playwright/test";

/**
 * Passe responsive et accessibilité (P9.5, P9.6).
 *
 * Ces vérifications avaient été reportées faute de navigateur, et marquées
 * comme telles plutôt que cochées. Elles sont ici **mesurées**, pas déduites
 * de la lecture des classes.
 *
 * Les quatre largeurs sont celles de la roadmap : 360, 768, 1024 et 1440.
 */

const WIDTHS = [
  { name: "mobile", width: 360, height: 780 },
  { name: "tablette", width: 768, height: 1024 },
  { name: "portable", width: 1024, height: 768 },
  { name: "bureau", width: 1440, height: 900 },
];

const PAGES = ["/", "/products", "/categories", "/categories/casques", "/cart", "/wishlist"];

/** Vrai quand le document déborde horizontalement. */
async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const root = document.documentElement;
    // Une marge d'un pixel absorbe les arrondis de sous-pixel, qui ne
    // produisent pas de barre de défilement réelle.
    return root.scrollWidth > root.clientWidth + 1;
  });
}

for (const viewport of WIDTHS) {
  test.describe(`${viewport.name} (${viewport.width} px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const path of PAGES) {
      test(`aucun débordement horizontal sur ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");

        expect(await hasHorizontalScroll(page)).toBe(false);
      });
    }
  });
}

test.describe("cibles tactiles", () => {
  test.use({ viewport: { width: 360, height: 780 }, hasTouch: true });

  test("les commandes font au moins 44 px de haut sur mobile", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    const buttons = page.locator("button:visible");
    const count = Math.min(await buttons.count(), 12);

    for (let index = 0; index < count; index += 1) {
      const box = await buttons.nth(index).boundingBox();
      if (!box) continue;

      expect(box.height, `bouton ${index}`).toBeGreaterThanOrEqual(43.5);
    }
  });
});

test.describe("navigation au clavier", () => {
  test("le lien d'évitement mène au contenu", async ({ page }) => {
    await page.goto("/products");

    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");

    await expect(focused).toHaveText("Aller au contenu");
    await expect(focused).toHaveAttribute("href", "#contenu");
  });

  test("le focus reste visible en parcourant l'en-tête", async ({ page }) => {
    await page.goto("/products");

    for (let index = 0; index < 6; index += 1) {
      await page.keyboard.press("Tab");

      const outline = await page.evaluate(() => {
        const element = document.activeElement;
        if (!element || element === document.body) return null;
        const style = getComputedStyle(element);
        return { width: style.outlineWidth, style: style.outlineStyle };
      });

      if (outline) {
        expect(outline.style, `élément ${index}`).not.toBe("none");
      }
    }
  });

  test("le tiroir mobile se ferme avec Échap", async ({ page }) => {
    // Comportement fourni par le `<dialog>` natif, qui est la raison pour
    // laquelle le projet n'embarque aucune bibliothèque de composants.
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/products");

    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("le focus est piégé dans le tiroir ouvert", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/products");

    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Vingt tabulations ne doivent atteindre aucun élément focalisable situé
    // hors du dialogue.
    //
    // La nuance est mesurée, pas théorique : en fin de cycle, Chromium repose
    // le focus sur `<body>` le temps d'une tabulation avant de revenir au
    // premier élément du dialogue. Ce n'est pas une fuite, `<body>` n'est pas
    // focalisable et rien du contenu masqué n'est atteint. Exiger
    // `dialog.contains(activeElement)` à chaque pas ferait échouer ce test sur
    // un comportement correct du navigateur.
    const visited: string[] = [];

    for (let index = 0; index < 20; index += 1) {
      await page.keyboard.press("Tab");

      const where = await page.evaluate(() => {
        const dialog = document.querySelector("dialog[open]");
        const active = document.activeElement;

        if (!dialog || !active) return "aucun dialogue";
        if (dialog.contains(active)) return "dedans";
        if (active === document.body) return "passage par body";

        return `fuite vers ${active.tagName.toLowerCase()}`;
      });

      visited.push(where);
      expect(where, `tabulation ${index}`).not.toMatch(/^fuite/);
    }

    // Et le cycle doit bien revenir dans le dialogue, sinon « aucune fuite »
    // serait satisfait par un focus définitivement perdu.
    expect(visited.filter((step) => step === "dedans").length).toBeGreaterThan(15);
  });
});
