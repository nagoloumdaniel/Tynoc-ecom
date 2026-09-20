import { expect, test, type Page } from "@playwright/test";

/**
 * Parcours A : découverte, produit, panier (P11.7).
 *
 * Les tests qui manipulent une quantité visent un produit **au stock connu et
 * suffisant**, et non « la première carte de la grille ». La première version
 * tombait sur un amplificateur à tubes dont le stock est de un : le second
 * ajout était refusé, à juste titre, et le test échouait sur un comportement
 * correct.
 *
 * Le premier des trois parcours critiques définis en P1.7. Il suit ce que fait
 * réellement un visiteur, sans raccourci par l'API : accueil, catégorie,
 * fiche, ajout, panier.
 *
 * Chaque test part d'un contexte neuf, donc d'une session neuve : les
 * parcours ne se transmettent pas un panier.
 */
/** Stock de 23 exemplaires : de quoi incrémenter sans buter sur le plafond. */
const WELL_STOCKED = "beyerdynamic-dt-770-pro-80";

/**
 * Le contenu de la page, à l'exclusion de la zone de transit du flux.
 *
 * Pendant qu'une frontière Suspense se résout, React dépose le fragment reçu
 * dans un `<div hidden>` placé à la racine du document, puis le déplace dans
 * l'arbre. Entre les deux, le même bouton existe **deux fois** dans le DOM, et
 * un sélecteur global lève une violation du mode strict, de manière
 * intermittente selon la vitesse de la machine.
 *
 * Cibler `main` écarte la copie de transit sans rien attendre d'arbitraire :
 * la zone de transit vit en dehors.
 */
const cart = (page: Page) => page.locator("main");

/** Première carte de la grille, hors zone de transit du flux. */
const cardIn = (page: Page) => page.locator("main article").first();

test.describe("découverte vers panier", () => {
  test("un visiteur trouve un produit et l'achète depuis la fiche", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Choisis pour leurs");

    // Entrée par une famille de produits.
    await page.goto("/categories/casques");
    await expect(page.getByRole("heading", { level: 1, name: "Casques" })).toBeVisible();

    // Première fiche de la grille. Le lien du titre porte le nom du produit :
    // celui de l'image n'a pas de texte accessible.
    const firstProduct = page.locator("main article h3 a").first();
    const title = (await firstProduct.innerText()).trim();
    await firstProduct.click();
    await expect(page).toHaveURL(/\/products\//);

    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByText("Ajouté au panier")).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByRole("heading", { level: 1, name: "Panier" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Récapitulatif" })).toBeVisible();
    await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
  });

  test("le compteur de l'en-tête suit le panier", async ({ page }) => {
    await page.goto("/products");
    await cardIn(page).getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(page.getByText("Ajouté au panier")).toBeVisible();

    await page.goto("/");
    // Le compteur arrive en flux derrière sa frontière Suspense.
    await expect(page.getByRole("link", { name: "Panier" }).getByText("1")).toBeVisible();
  });

  test("le même produit ajouté deux fois incrémente au lieu de se dupliquer", async ({ page }) => {
    // Exigence explicite du brief. Vérifiée ici de bout en bout, pas seulement
    // au niveau du service.
    await page.goto(`/products/${WELL_STOCKED}`);

    const addButton = page.getByRole("button", { name: "Ajouter au panier" });
    await addButton.click();
    await expect(page.getByText("Ajouté au panier")).toBeVisible();
    await addButton.click();

    await page.goto("/cart");
    await expect(cart(page).getByRole("button", { name: "Retirer" })).toHaveCount(1);
    await expect(cart(page).getByLabel("Quantité", { exact: true })).toHaveValue("2");
  });

  test("la quantité modifiée est conservée par le serveur", async ({ page }) => {
    await page.goto(`/products/${WELL_STOCKED}`);
    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByText("Ajouté au panier")).toBeVisible();

    await page.goto("/cart");

    // L'écriture est volontairement différée de 450 ms, pour qu'une rafale de
    // clics ne produise qu'un appel. Le test attend donc l'écriture plutôt que
    // de courir contre elle : recharger avant l'envoi mesurerait la latence de
    // la machine, pas le comportement de l'application.
    const written = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.request().isNavigationRequest() === false,
    );

    await cart(page).getByLabel("Augmenter la quantité").click();
    await expect(cart(page).getByLabel("Quantité", { exact: true })).toHaveValue("2");
    await written;

    // Le rechargement est le test réel : un état purement client repartirait
    // à 1. La valeur doit venir de la base.
    await page.reload();
    await expect(cart(page).getByLabel("Quantité", { exact: true })).toHaveValue("2");
  });

  test("le retrait est annulable", async ({ page }) => {
    await page.goto("/products");
    await cardIn(page).getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(page.getByText("Ajouté au panier")).toBeVisible();

    await page.goto("/cart");
    await cart(page).getByRole("button", { name: "Retirer" }).click();

    // Rien ne disparaît sans filet : la notification propose de revenir.
    await expect(page.getByRole("button", { name: "Annuler" })).toBeVisible();
    await page.getByRole("button", { name: "Annuler" }).click();

    await page.reload();
    await expect(cart(page).getByRole("button", { name: "Retirer" })).toHaveCount(1);
  });

  test("un panier vide propose une sortie plutôt qu'un cul-de-sac", async ({ page }) => {
    await page.goto("/cart");

    await expect(page.getByText("Votre panier est vide.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Parcourir le catalogue" })).toBeVisible();
  });
});
