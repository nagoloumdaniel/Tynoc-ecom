import { expect, test } from "@playwright/test";

/**
 * Parcours C : favoris vers panier (P11.7).
 *
 * Le troisième parcours critique de P1.7. Deux propriétés y sont vérifiées et
 * ne peuvent l'être qu'ici, dans un vrai navigateur :
 *
 * - l'état du cœur survit à un rechargement, donc il vient bien de la base ;
 * - le déplacement vers le panier est atomique du point de vue du visiteur.
 */
test.describe("favoris vers panier", () => {
  test("le cœur bascule et survit au rechargement", async ({ page }) => {
    await page.goto("/products");

    const heart = page.getByRole("button", { name: /Ajouter .* aux favoris/ }).first();
    await heart.click();
    await expect(page.getByText(/ajouté aux favoris/)).toBeVisible();

    // Le rechargement est le test réel : un état purement local repartirait
    // vide (P8.7).
    await page.reload();
    await expect(
      page.getByRole("button", { name: /Retirer .* des favoris/ }).first(),
    ).toBeVisible();
  });

  test("un produit mis en favori apparaît sur la page dédiée", async ({ page }) => {
    await page.goto("/products");
    await page
      .getByRole("button", { name: /Ajouter .* aux favoris/ })
      .first()
      .click();
    await expect(page.getByText(/ajouté aux favoris/)).toBeVisible();

    await page.goto("/wishlist");
    await expect(page.getByRole("heading", { level: 1, name: "Favoris" })).toBeVisible();
    await expect(
      page.locator("main").getByRole("button", { name: "Déplacer vers le panier" }),
    ).toHaveCount(1);
  });

  test("le déplacement vide la liste et remplit le panier", async ({ page }) => {
    await page.goto("/products");
    await page
      .getByRole("button", { name: /Ajouter .* aux favoris/ })
      .first()
      .click();
    await expect(page.getByText(/ajouté aux favoris/)).toBeVisible();

    await page.goto("/wishlist");
    await page.locator("main").getByRole("button", { name: "Déplacer vers le panier" }).click();
    await expect(page.getByText(/déplacé vers le panier/)).toBeVisible();

    await page.reload();
    await expect(page.locator("main").getByText("Aucun favori pour l'instant.")).toBeVisible();

    await page.goto("/cart");
    await expect(page.locator("main").getByRole("button", { name: "Retirer" })).toHaveCount(1);
  });

  test("un produit en rupture reste mettable en favori", async ({ page }) => {
    // C'est même l'usage principal d'une liste de souhaits : mettre de côté ce
    // qu'on ne peut pas acheter tout de suite.
    await page.goto("/products/focal-clear-mg");

    await expect(page.locator("main").getByText("Rupture de stock")).toBeVisible();
    await expect(page.locator("main").getByRole("button", { name: "Indisponible" })).toBeDisabled();

    await page
      .getByRole("button", { name: /Ajouter .* aux favoris/ })
      .first()
      .click();
    await expect(page.getByText(/ajouté aux favoris/)).toBeVisible();

    await page.goto("/wishlist");
    await expect(page.getByRole("button", { name: "Indisponible" }).first()).toBeVisible();
  });

  test("une liste vide propose une sortie", async ({ page }) => {
    await page.goto("/wishlist");

    await expect(page.locator("main").getByText("Aucun favori pour l'instant.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Parcourir le catalogue" })).toBeVisible();
  });
});
