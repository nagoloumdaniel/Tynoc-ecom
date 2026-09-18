import { existsSync } from "node:fs";

/**
 * Chargement de `.env.local` pour les tests d'intégration.
 *
 * Les tests unitaires n'en ont pas besoin : ils ne touchent ni à la base ni à
 * `env`. Les tests d'intégration, eux, ouvrent une connexion vers DynamoDB
 * Local, et exiger de l'appelant qu'il exporte six variables à la main serait
 * un piège à chaque exécution.
 *
 * `process.loadEnvFile` est natif depuis Node 20.12 : aucune dépendance de
 * plus, et les variables déjà présentes dans l'environnement ne sont pas
 * écrasées, ce qui laisse la CI fournir les siennes.
 */
const ENV_FILE = ".env.local";

if (existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}
