import { defineConfig, devices } from "@playwright/test";

/**
 * Configuration Playwright (P11.7).
 *
 * Les tests de bout en bout tournent contre le **build de production**, pas
 * contre le serveur de développement. La différence n'est pas cosmétique : le
 * mode développement ne prérend pas, ne sert pas les images optimisées et
 * recompile à la volée. Mesurer la performance ou vérifier le prérendu sur ce
 * mode ne prouverait rien.
 *
 * `webServer` construit puis démarre le serveur lui-même, sur un port qui
 * n'est qu'à lui.
 *
 * Les deux détails ont été payés. Réutiliser un serveur déjà lancé a fait
 * passer une exécution entière contre un build périmé, écrasé sous ses pieds
 * par une reconstruction : le serveur répondait 500 sur les Server Actions, et
 * l'échec ressemblait à un défaut de l'application. Et occuper le port 3000
 * entrait en conflit avec le `npm run dev` du développeur.
 *
 * Reconstruire coûte une minute par exécution. Un résultat de test qui ne
 * correspond pas au code coûte beaucoup plus cher.
 */
/** Port dédié aux tests, pour ne pas entrer en conflit avec `npm run dev`. */
const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  // Un seul worker : les parcours écrivent dans la même table DynamoDB Local,
  // et deux sessions concurrentes se marcheraient dessus.
  workers: 1,
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env["CI"] ? "github" : "list",

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Trace conservée au premier échec : reconstituer un parcours à partir
    // d'un message d'assertion seul est beaucoup plus long.
    trace: "retain-on-failure",
    locale: "fr-FR",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    // Jamais de réutilisation : le serveur doit servir le build que ces tests
    // viennent de produire, et rien d'autre.
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
