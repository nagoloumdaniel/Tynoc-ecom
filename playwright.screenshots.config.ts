import { defineConfig, devices } from "@playwright/test";

import baseConfig from "./playwright.config";

/**
 * Captures d'écran du README (P13.2).
 *
 * Produites par Playwright plutôt qu'à la main, pour deux raisons : elles se
 * régénèrent à l'identique après un changement d'interface, et elles montrent
 * le build de production, pas le serveur de développement avec sa barre
 * d'outils.
 *
 * Même serveur que les tests de bout en bout (build frais, port dédié), mais
 * un dossier et une commande à part : ce ne sont pas des tests, et elles
 * n'ont rien à faire dans la CI.
 */
export default defineConfig({
  ...baseConfig,
  testDir: "./tests/screenshots",
  reporter: "list",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
