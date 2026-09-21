import { expect, test } from "@playwright/test";

/**
 * Pages introuvables (brief : « Gestion du 404 »).
 *
 * Ce fichier manquait, et son absence a caché un défaut réel jusqu'en P13 :
 * un produit inexistant affichait « La connexion à la base de données a
 * échoué ». Le `NotFoundError` levé dans une fonction `"use cache"` perdait sa
 * classe en franchissant la frontière du cache, la page ne le reconnaissait
 * plus et le traitait comme une panne. Les tests unitaires et d'intégration
 * ne pouvaient pas le voir : ils n'exécutent pas le cache de Next.
 *
 * **Sur le code HTTP.** Une adresse inconnue reçoit un vrai 404. Un slug
 * inconnu reçoit un 200 : avec les Cache Components, la coquille statique part
 * avant que le produit soit lu, et un statut ne change plus une fois la
 * réponse commencée. Next injecte alors `noindex`, ce qui tient la page hors
 * des résultats de recherche : c'est le « soft 404 » documenté.
 *
 * Obtenir un vrai 404 demanderait de vérifier le slug dans `proxy.ts`, avant
 * tout rendu : une lecture DynamoDB à chaque vue produit, et le proxy qui
 * appellerait les services. Le compromis documenté est gardé, et vérifié
 * ci-dessous plutôt que supposé.
 */

const CASES = [
  { label: "un produit inexistant", path: "/products/ce-produit-n-existe-pas", status: 200 },
  { label: "une catégorie inexistante", path: "/categories/tourne-disques", status: 200 },
  { label: "une adresse inconnue", path: "/une-page-qui-n-existe-pas", status: 404 },
];

for (const { label, path, status } of CASES) {
  test(`${label} mène à la page 404, pas à une page d'erreur`, async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(status);
    await expect(
      page.getByRole("heading", { level: 1, name: "Cette page n'existe pas." }),
    ).toBeVisible();
    await expect(page.getByText(/base de données/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Parcourir le catalogue" })).toBeVisible();

    // Indispensable quand le statut reste 200 : sans lui, un moteur
    // indexerait la page introuvable comme une vraie page. Lu après le titre,
    // donc une fois la réponse en flux arrivée.
    expect(await page.locator('meta[name="robots"][content*="noindex"]').count()).toBeGreaterThan(
      0,
    );
  });
}
