import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Règle de dépendance entre couches (P12.4), vérifiée par la machine.
 *
 * `AGENTS.md` la déclare non négociable. Un contrôle par `grep` ne vaut que le
 * jour où on le lance ; celui-ci tourne à chaque `npm run lint`, donc à chaque
 * commit et dans la CI. Une violation devient une erreur de lint, pas une
 * remarque de revue.
 *
 * Chaque bloc liste ce qu'une couche ne doit **jamais** importer. Les
 * messages disent par où passer, pas seulement ce qui est interdit.
 */

/** Motifs réutilisés d'une couche à l'autre. */
const DATA_ACCESS = [
  {
    group: ["@/server/repositories", "@/server/repositories/*", "**/repositories/*"],
    message: "Un repository ne s'importe que depuis un service. Passer par `@/server/services`.",
  },
  {
    group: ["@/lib/dynamodb", "@aws-sdk/*"],
    message: "Le SDK AWS ne se manipule que dans `src/server/repositories/`.",
  },
  {
    group: ["@/lib/keys"],
    message: "Les clés DynamoDB (`PK`/`SK`) ne sortent pas de la couche repository.",
  },
];

const FRAMEWORK = [
  {
    group: ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*"],
    message: "La couche métier ne connaît ni Next ni React : elle doit se tester sans eux.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Interface : pages, mises en page, composants.
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: DATA_ACCESS }],
    },
  },

  // Services : logique métier pure.
  {
    files: ["src/server/services/**/*.ts"],
    ignores: ["src/server/services/index.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...FRAMEWORK,
            {
              group: ["@/server/repositories", "@/server/repositories/*", "../repositories/*"],
              message:
                "Un service reçoit ses repositories en paramètre. Le câblage vit dans `services/index.ts`.",
            },
            {
              group: ["@/lib/dynamodb", "@aws-sdk/*", "@/lib/keys"],
              message: "Un service ne connaît ni le SDK ni `PK`/`SK`.",
            },
            {
              group: [
                "@/server/actions",
                "@/server/actions/*",
                "@/server/session",
                "@/lib/session",
              ],
              message: "Un service ne connaît ni HTTP ni cookie : l'identité lui est passée.",
            },
          ],
        },
      ],
    },
  },

  // Racine de composition : seul point où services et repositories se
  // rencontrent. Toujours sans framework.
  {
    files: ["src/server/services/index.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: FRAMEWORK }],
    },
  },

  // Repositories : accès aux données, sans règle métier ni remontée.
  {
    files: ["src/server/repositories/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...FRAMEWORK,
            {
              group: [
                "@/server/services",
                "@/server/services/*",
                "@/server/actions",
                "@/server/actions/*",
              ],
              message:
                "Le sens des flèches ne s'inverse jamais : un repository n'appelle rien au-dessus de lui.",
            },
          ],
        },
      ],
    },
  },

  // Socle partagé : utilitaires, schémas, types. Importé par toutes les
  // couches, il n'en importe donc aucune.
  {
    files: ["src/lib/**/*.ts", "src/schemas/**/*.ts", "src/types/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*", "@/components/*", "@/app/*"],
              message: "Le socle partagé ne dépend d'aucune couche applicative.",
            },
          ],
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
