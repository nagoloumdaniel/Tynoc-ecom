import { defineConfig } from "vitest/config";

/**
 * Harnais de test (P2.0).
 *
 * Deux projets distincts, parce qu'ils n'ont pas les mêmes prérequis :
 *
 * - `unit` : les services et les utilitaires. Pur, rapide, aucune dépendance
 *   externe. C'est ce qui tourne en boucle pendant le développement, et c'est
 *   ce que `npm run verify` exige avant un commit.
 * - `integration` : les repositories contre DynamoDB Local. Exige le conteneur
 *   Docker démarré, donc séparé pour que son absence ne casse pas `npm test`.
 *
 * Extension `.mts` : le fichier est en ESM, et sans elle Vite le charge comme
 * du CommonJS et avertit à chaque exécution.
 */
export default defineConfig({
  resolve: {
    // Résolution native des alias `@/*` du tsconfig. Vite 8 la gère
    // lui-même, le plugin `vite-tsconfig-paths` n'a plus lieu d'être.
    tsconfigPaths: true,

    alias: {
      /**
       * `src/lib/env.ts` importe `server-only`, qui lève une erreur dès qu'il
       * est chargé hors d'un Server Component. C'est son rôle et il reste dans
       * le code de production. Les tests tournent dans Node sans contexte
       * React : on le remplace donc par un module vide.
       *
       * Un alias plutôt qu'une condition `react-server` : le SDK AWS classe
       * `module` avant `node` dans son champ `exports`, donc toucher aux
       * conditions de résolution le fait basculer vers des bundles que Node ne
       * sait pas charger.
       */
      "server-only": new URL("./tests/stubs/server-only.ts", import.meta.url).pathname,
    },
  },
  test: {
    globals: false,
    environment: "node",
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          // Charge `.env.local` avant tout import : `lib/env.ts` valide la
          // configuration au chargement du module et échouerait sans elle.
          setupFiles: ["tests/setup/load-env.ts"],
          // Une table DynamoDB Local partagée ne supporte pas l'exécution
          // concurrente des suites : les fixtures se marcheraient dessus.
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      include: ["src/server/services/**", "src/lib/**"],
      exclude: ["src/lib/dynamodb.ts", "src/lib/env.ts"],
    },
  },
});
