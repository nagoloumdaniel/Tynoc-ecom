<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Tynoc E-Commerce — conventions du projet

Application e-commerce full-stack. Le besoin est décrit dans [docs/BRIEF.md](docs/BRIEF.md),
le plan d'exécution dans [docs/ROADMAP.md](docs/ROADMAP.md). **Lire la roadmap avant de coder** :
chaque tâche y porte son critère d'acceptation.

## Stack

| Couche | Choix |
| --- | --- |
| Framework | Next.js 16.3 (App Router, Turbopack) |
| UI | React 19.2 |
| Langage | TypeScript 5 en mode strict renforcé |
| Styling | Tailwind CSS v4 (config via `@theme` dans `globals.css`) |
| Base de données | AWS DynamoDB — single-table design |
| Validation | Zod 4 |

## Règle de dépendance entre couches — non négociable

```text
app/ → server/actions/ + app/api/ → server/services/ → server/repositories/ → lib/dynamodb
```

- Un composant UI n'importe **jamais** un repository.
- Un repository ne contient **aucune** règle métier.
- Un service ne connaît **ni** HTTP, **ni** React, **ni** `PK`/`SK`.
- Le sens des flèches ne s'inverse jamais.

C'est le critère d'architecture le plus visible à l'évaluation. Toute violation est un bug.

## Emplacement du code

| Dossier | Contenu |
| --- | --- |
| `src/app/` | Routes, layouts, pages, route handlers |
| `src/components/ui/` | Primitives réutilisables et agnostiques du domaine |
| `src/components/{product,cart,layout,feedback}/` | Composants métier |
| `src/server/actions/` | Server Actions (`"use server"`) |
| `src/server/services/` | **Logique métier** — pure, testable, sans dépendance framework |
| `src/server/repositories/` | Accès DynamoDB, et rien d'autre |
| `src/lib/` | Client DB, env, erreurs, clés, session, utilitaires |
| `src/schemas/` | Schémas Zod partagés (source de vérité des types) |
| `src/types/` | Types et interfaces du domaine |
| `scripts/` | Création de table, seed |
| `tests/{unit,integration,e2e}/` | Tests |

## Règles de code

- **Types depuis Zod** : définir le schéma, puis `z.infer`. Ne jamais dupliquer un type à la main.
- **Aucun `process.env` brut** hors de `src/lib/env.ts`. Tout passe par `env`.
- **Aucune clé DynamoDB concaténée à la main** hors de `src/lib/keys.ts`.
- **Aucune erreur AWS brute** ne remonte à l'UI : la traduire en `AppError` dans le repository.
- **Prix en centimes** (entiers). Jamais de flottant pour de l'argent.
- **`"use client"` le plus bas possible** dans l'arbre : les pages restent des Server Components.
- **Variantes plutôt que props booléennes** : `variant="ghost"`, pas `isGhost` + `isPrimary`.
- **Identité utilisateur toujours dérivée du cookie serveur**, jamais d'un paramètre client (P15.1).

## Commandes

```bash
npm run dev           # serveur de développement (Turbopack)
npm run build         # build de production
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run format        # prettier --write
npm run verify        # typecheck + lint + format:check — à passer avant tout commit
```

## Git

- Branches : `feat/…`, `fix/…`, `docs/…`, `chore/…`, `refactor/…`, `test/…`
- Commits : [Conventional Commits](https://www.conventionalcommits.org/), en anglais, à l'impératif.
  Exemple : `feat(cart): add quantity update with stock ceiling`
- Un commit = une unité de travail cohérente. Pas de commit « wip ».
- `npm run verify` doit passer avant chaque commit.
- Une phase de la roadmap = un push.

## Pièges connus de cet environnement

- **Next.js 16 ≠ Next.js 15** : lire `node_modules/next/dist/docs/` avant d'écrire du code
  spécifique au framework (voir le bloc en haut de ce fichier).
- **Noms de variables AWS sur Vercel** : le runtime Lambda réserve `AWS_REGION`,
  `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY`. Le projet utilise le préfixe `APP_AWS_`.
- **`noUncheckedIndexedAccess` est actif** : `array[0]` est typé `T | undefined`. C'est voulu.
- Le dossier du dépôt contient des majuscules (`Tynoc-ecom`), ce que npm refuse comme nom de
  paquet : le `name` du `package.json` est `tynoc-ecom`.
