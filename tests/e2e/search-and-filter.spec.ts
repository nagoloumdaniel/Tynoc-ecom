import { expect, test, type Page } from "@playwright/test";

/**
 * Choisit une option dans un menu déroulant personnalisé, comme le ferait un
 * visiteur : ouvrir, puis cliquer l'option par son libellé.
 */
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** Valeur portée par le champ caché du menu, celle qui part dans l'URL. */
function filterValue(page: Page, name: string) {
  return page.locator(`main form input[type="hidden"][name="${name}"]`);
}

/**
 * Parcours B : recherche puis filtrage (P11.7).
 *
 * Le deuxième parcours critique de P1.7. Ce qu'il vérifie au-delà de
 * l'affichage : que **tout l'état vit dans l'URL**, donc qu'un résultat se
 * partage, se recharge, et que le bouton « retour » du navigateur fait ce
 * qu'on attend de lui.
 */
test.describe("recherche et filtres", () => {
  test("une recherche depuis l'en-tête mène aux résultats", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Rechercher un produit").fill("casque");
    await page.getByLabel("Rechercher un produit").press("Enter");

    await expect(page).toHaveURL(/\/products\?q=casque/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Résultats pour");
  });

  test("les filtres se retrouvent dans l'adresse", async ({ page }) => {
    await page.goto("/products");

    await choose(page, "Catégorie", "Microphones");
    await expect(page).toHaveURL(/category=microphones/);

    await choose(page, "Tri", "Prix croissant");
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(page).toHaveURL(/category=microphones/);
  });

  test("le menu de tri se pilote au clavier jusqu'à l'adresse", async ({ page }) => {
    // Le menu personnalisé doit rester utilisable sans souris : c'est la
    // condition pour avoir remplacé le `select` natif.
    await page.goto("/products");
    const sort = page.getByRole("combobox", { name: "Tri", exact: true });

    await sort.focus();
    await page.keyboard.press("ArrowDown");
    await expect(sort).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/sort=name/);
    await expect(sort).toHaveText("Nom");
  });

  test("une adresse filtrée se recharge à l'identique", async ({ page }) => {
    // C'est la conséquence utile du choix de porter l'état par l'URL : le lien
    // se partage tel quel.
    const titles = page.locator("main article h3 a");

    // `allInnerTexts` n'attend rien : il lit la grille à l'instant où il est
    // appelé. La grille arrive en flux, donc on attend qu'elle soit là. En
    // local la course passait ; contre le site en ligne, le test lisait une
    // grille vide ou partielle (trouvé en P14).
    await page.goto("/products?category=casques&sort=price-desc");
    await expect(titles.first()).toBeVisible();
    const order = await titles.allInnerTexts();

    await page.reload();
    await expect(titles.first()).toBeVisible();
    const afterReload = await titles.allInnerTexts();

    expect(afterReload).toEqual(order);
    expect(order.length).toBeGreaterThan(1);
    await expect(filterValue(page, "sort")).toHaveValue("price-desc");
    await expect(page.getByRole("combobox", { name: "Tri", exact: true })).toHaveText(
      "Prix décroissant",
    );
  });

  test("le bouton retour annule un filtre", async ({ page }) => {
    await page.goto("/products");
    await choose(page, "Catégorie", "Câblage");
    await expect(page).toHaveURL(/category=cables/);

    await page.goBack();
    await expect(page).not.toHaveURL(/category=cables/);
  });

  test("les champs suivent l'adresse après réinitialisation et retour", async ({ page }) => {
    // Les champs sont non contrôlés, initialisés depuis l'URL. Sans remontage
    // à chaque changement d'adresse, ils gardaient l'ancienne valeur, et le
    // changement de filtre suivant renvoyait l'ancienne sélection (trouvé en
    // revue, P12.1).
    await page.goto("/products?category=casques");
    const category = filterValue(page, "category");
    await expect(category).toHaveValue("casques");

    await page.getByRole("button", { name: "Réinitialiser" }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(category).toHaveValue("");

    await page.goBack();
    await expect(page).toHaveURL(/category=casques/);
    await expect(category).toHaveValue("casques");
  });

  test("le tri par prix ordonne réellement les résultats", async ({ page }) => {
    await page.goto("/products?sort=price-asc&category=casques");

    // Le prix est le dernier nombre de la carte, en chiffres tabulaires.
    await expect(page.locator("main article").first()).toBeVisible();
    const texts = await page.locator("main article").allInnerTexts();
    const values = texts.map((text) => {
      const match = text.match(/([0-9   ]+,[0-9]{2})/);
      return Number((match?.[1] ?? "0").replace(/[   ]/g, "").replace(",", "."));
    });

    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  test("une recherche sans résultat propose une issue", async ({ page }) => {
    await page.goto("/products?q=tourne-disque");

    await expect(page.getByText(/Aucun résultat pour/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir tout le catalogue" })).toBeVisible();
  });

  test("un paramètre absurde ne casse pas la page", async ({ page }) => {
    // Une adresse mal recopiée doit afficher la première page, pas un écran
    // d'erreur.
    await page.goto("/products?page=abc&sort=n-importe-quoi&minPrice=xyz");

    await expect(page.getByRole("heading", { level: 1, name: "Catalogue" })).toBeVisible();
    await expect(page.locator("main article").first()).toBeVisible();
  });

  test("la pagination conserve les filtres", async ({ page }) => {
    await page.goto("/products?sort=price-asc");

    const nextLink = page.getByRole("link", { name: "Page suivante" });
    if ((await nextLink.count()) > 0) {
      await nextLink.click();
      await expect(page).toHaveURL(/sort=price-asc/);
      await expect(page).toHaveURL(/page=2/);
    }
  });
});
