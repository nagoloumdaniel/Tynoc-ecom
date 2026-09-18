import "server-only";

import { z } from "zod";

/**
 * Validation des variables d'environnement (P0.5).
 *
 * Règle du projet : aucun `process.env.X` brut ailleurs dans le code applicatif.
 * Tout passe par `env`, qui est typé et validé au démarrage du processus serveur.
 * Une variable manquante fait échouer le boot avec un message explicite, plutôt
 * que de produire un `undefined` qui casse trois couches plus bas.
 *
 * Note sur le préfixe `APP_AWS_` : Vercel s'exécute sur un runtime Lambda qui
 * réserve les noms `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` et `AWS_REGION`.
 * On ne peut pas les définir librement dans le dashboard. D'où le préfixe, qui
 * évite un blocage découvert seulement au moment du déploiement (P14.2).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // --- AWS / DynamoDB ---
  APP_AWS_REGION: z.string().min(1, "Région AWS requise (ex. eu-west-3)"),
  APP_AWS_ACCESS_KEY_ID: z.string().min(16, "Clé d'accès AWS invalide ou absente"),
  APP_AWS_SECRET_ACCESS_KEY: z.string().min(32, "Clé secrète AWS invalide ou absente"),
  DYNAMODB_TABLE_NAME: z.string().min(1, "Nom de la table DynamoDB requis"),

  /**
   * Endpoint local optionnel (DynamoDB Local via Docker, P2.10).
   * Absent en production : le SDK cible alors le service AWS réel.
   */
  DYNAMODB_ENDPOINT: z.url().optional(),

  // --- Session (P15.5 / P15.6) ---
  /**
   * Secret de signature HMAC du cookie de session. 32 caractères minimum.
   * Générer avec : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   */
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET doit faire au moins 32 caractères"),

  // --- Application ---
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".")} : ${issue.message}`)
      .join("\n");

    // On échoue bruyamment et tôt. Le message liste TOUTES les variables
    // fautives d'un coup, au lieu de les faire découvrir une par une.
    throw new Error(
      `Configuration d'environnement invalide.\n${details}\n\n` +
        `Copiez .env.example vers .env.local et renseignez les valeurs manquantes.`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();

/** Vrai quand l'application cible une instance DynamoDB locale. */
export const isLocalDynamo = Boolean(env.DYNAMODB_ENDPOINT);
export const isProduction = env.NODE_ENV === "production";
