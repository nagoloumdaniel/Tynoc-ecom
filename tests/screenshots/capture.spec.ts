import { expect, test, type Page } from "@playwright/test";

/**
 * Génère `docs/screenshots/*.png` (P13.2). Lancer avec `npm run screenshots`.
 *
 * Chaque capture attend que le contenu en flux soit là et que le réseau se
 * taise : une capture de squelette ne montrerait rien de l'application.
 */

const OUT = "docs/screenshots";

const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 768, height: 1024 };
const MOBILE = { width: 390, height: 844 };

/** Produit au stock suffisant, pour un panier crédible. */
const PRODUCT = "sennheiser-hd-660s2";

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  // Laisse finir les apparitions en `@starting-style`.
  await page.waitForTimeout(400);
}

async function shoot(page: Page, name: string, fullPage = false) {
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
}

async function fillCart(page: Page) {
  for (const slug of [PRODUCT, "beyerdynamic-dt-770-pro-80"]) {
    await page.goto(`/products/${slug}`);
    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByText("Ajouté au panier").first()).toBeVisible();
  }
}

test.describe.configure({ mode: "serial" });

test("bureau", async ({ page }) => {
  await page.setViewportSize(DESKTOP);

  await page.goto("/");
  await shoot(page, "01-accueil");

  await page.goto("/categories/casques");
  await shoot(page, "02-categorie");

  await page.goto("/products?sort=price-desc&category=casques");
  await shoot(page, "03-filtres");

  await page.goto("/products?q=sennheiser");
  await shoot(page, "04-recherche");

  await page.goto(`/products/${PRODUCT}`);
  await shoot(page, "05-fiche-produit");

  await page.goto(`/products/${PRODUCT}`);
  await page
    .locator("main")
    .getByRole("button", { name: /aux favoris/ })
    .first()
    .click();
  await expect(page.getByText(/ajouté aux favoris/)).toBeVisible();
  await fillCart(page);

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Récapitulatif" })).toBeVisible();
  await shoot(page, "06-panier");

  await page.goto("/wishlist");
  await shoot(page, "07-favoris");

  await page.goto("/account");
  await shoot(page, "08-donnees");
});

test("états", async ({ page }) => {
  await page.setViewportSize(DESKTOP);

  // Session neuve : panier vide.
  await page.goto("/cart");
  await expect(page.getByText("Votre panier est vide.")).toBeVisible();
  await shoot(page, "09-panier-vide");

  await page.goto("/products?q=tourne-disque");
  await shoot(page, "10-aucun-resultat");

  await page.goto("/products/ce-produit-n-existe-pas");
  await shoot(page, "11-page-introuvable");
});

test("tablette", async ({ page }) => {
  await page.setViewportSize(TABLET);

  await page.goto("/categories/casques");
  await shoot(page, "12-tablette-categorie");
});

test("mobile", async ({ page }) => {
  await page.setViewportSize(MOBILE);

  await page.goto("/");
  await shoot(page, "13-mobile-accueil");

  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await shoot(page, "14-mobile-menu");
  await page.keyboard.press("Escape");

  await page.goto(`/products/${PRODUCT}`);
  await shoot(page, "15-mobile-fiche");

  await fillCart(page);
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Récapitulatif" })).toBeVisible();
  await shoot(page, "16-mobile-panier");
});
