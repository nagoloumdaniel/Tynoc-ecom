# Roadmap : Tynoc E-Commerce

> Plan d'exécution complet, de zéro jusqu'à la soumission finale.
> Référence du besoin : [BRIEF.md](./BRIEF.md).
> Chaque tâche porte les **skills** à invoquer pour la réaliser (mapping `~/.claude/CLAUDE.md`).

**Légende des skills** : `nom` = skill tiers (`~/.claude/skills/`), `/nom` = skill natif du harness,
`plugin:nom` = skill de plugin. Les skills transverses (`caveman`, `brainstorming`,
`verification-before-completion`, `caveman-commit`) s'appliquent en toile de fond et ne sont
rappelés que là où ils sont structurants.

---

## 0. Décisions d'architecture verrouillées

Ces choix sont pris une fois pour toutes et ne seront pas rediscutés en cours de route.

| Sujet | Décision | Justification |
| --- | --- | --- |
| Framework | **Next.js 16.3, App Router** | Imposé par le brief ; App Router = Server Components + Server Actions dans le même modèle. ⚠️ Next 16 comporte des ruptures d'API vs 15 : consulter `node_modules/next/dist/docs/` avant d'écrire du code spécifique au framework |
| Langage | **TypeScript strict** (`strict: true`, `noUncheckedIndexedAccess`) | « Use TypeScript properly » est un critère d'évaluation |
| Styling | **Tailwind CSS v4** | Imposé |
| Base de données | **AWS DynamoDB**, table unique (single-table design) | Imposé ; le single-table démontre une vraie compréhension de DynamoDB |
| SDK | `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` (DocumentClient) | SDK v3, tree-shakable, natif TypeScript |
| Validation | **Zod** | Une source de vérité : schéma → type TS inféré → validation runtime |
| Gestion panier/wishlist | Server Actions + `revalidatePath`, état serveur | Évite un state manager client ; la logique métier reste côté serveur |
| Identité utilisateur | Cookie httpOnly `sessionUserId` (UUID), utilisateur persisté en base | Le brief demande la « gestion des données utilisateur », pas une auth complète |
| Tests | **Vitest** (unitaire/intégration) + **Playwright** (E2E, parcours critiques) | Vitest s'aligne sur l'écosystème Vite/Next ; Playwright pour les 3 parcours clés |
| Déploiement | **Vercel** + table DynamoDB région `eu-west-3` | Déploiement Next.js sans friction ; lien live demandé au rendu |
| Images | `next/image` + images distantes (Unsplash/placeholder) déclarées dans `next.config` | Pas de binaires lourds dans le dépôt |
| Environnement de dev | **DynamoDB Local (Docker)**, pas AWS réel | Coût nul, tests d'intégration hors ligne. Le compte AWS n'est créé qu'en P14 pour la production. `DYNAMODB_ENDPOINT` est le chemin nominal en développement |
| Périmètre livrable | Core P0 → P14 **+ uniquement les tâches [E]** de P15/P16/P17 | M8 (livraison) prime sur le durcissement. Les [D] sont abandonnées, les [R] réévaluées après M5 |
| Magasin | **Audio et matériel d'écoute** | Détermine le seed, les filtres et la direction artistique. Voir `ARCHITECTURE.md` § 2 |
| Recherche | Chargement borné du catalogue + filtrage applicatif | DynamoDB ne fait pas de full-text. ~45 produits : la limite est assumée et documentée, pas masquée derrière un `Scan` paginé |

### Arborescence cible

```text
Tynoc-ecom/
├─ docs/
│  ├─ BRIEF.md                  # énoncé traduit (référence)
│  ├─ ROADMAP.md                # ce fichier
│  ├─ ARCHITECTURE.md           # schéma de flux + couches
│  ├─ DATA-MODEL.md             # single-table design, patterns d'accès, CRUD
│  └─ screenshots/              # captures pour le rendu
├─ scripts/
│  ├─ create-table.ts           # création de la table + GSI (idempotent)
│  └─ seed.ts                   # injection catégories + produits de démo
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx                       # accueil
│  │  ├─ not-found.tsx                  # 404 global
│  │  ├─ error.tsx                      # error boundary global
│  │  ├─ loading.tsx
│  │  ├─ products/
│  │  │  ├─ page.tsx                    # listing + recherche + filtres
│  │  │  ├─ loading.tsx
│  │  │  └─ [slug]/page.tsx             # détail produit
│  │  ├─ categories/
│  │  │  ├─ page.tsx
│  │  │  └─ [slug]/page.tsx
│  │  ├─ cart/page.tsx
│  │  ├─ wishlist/page.tsx
│  │  └─ api/
│  │     ├─ products/route.ts
│  │     ├─ products/[id]/route.ts
│  │     ├─ categories/route.ts
│  │     ├─ cart/route.ts
│  │     └─ wishlist/route.ts
│  ├─ components/
│  │  ├─ ui/                            # primitives : Button, Input, Badge, Skeleton…
│  │  ├─ product/                       # ProductCard, ProductGrid, ProductGallery…
│  │  ├─ cart/                          # CartLine, CartSummary, QuantityStepper…
│  │  ├─ layout/                        # Header, Footer, MobileNav, SearchBar…
│  │  └─ feedback/                      # EmptyState, ErrorState, LoadingState
│  ├─ server/
│  │  ├─ actions/                       # Server Actions (cart, wishlist)
│  │  ├─ services/                      # LOGIQUE MÉTIER (pure, testable)
│  │  └─ repositories/                  # ACCÈS DYNAMODB uniquement
│  ├─ lib/
│  │  ├─ dynamodb.ts                    # client singleton
│  │  ├─ env.ts                         # validation des variables d'env (Zod)
│  │  ├─ errors.ts                      # AppError, NotFoundError, ValidationError…
│  │  ├─ keys.ts                        # fabriques de clés PK/SK
│  │  ├─ session.ts                     # cookie utilisateur
│  │  └─ utils.ts
│  ├─ schemas/                          # schémas Zod partagés
│  └─ types/                            # types & interfaces du domaine
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ e2e/
├─ .env.example
├─ .env.local                           # jamais commité
└─ README.md
```

**Règle de dépendance (non négociable)** : `app` → `actions/api` → `services` → `repositories` →
`dynamodb`. Une couche n'appelle jamais une couche située plus haut, et un composant UI n'importe
jamais un repository.

### Modèle de données : patterns d'accès à couvrir

Le single-table design se conçoit à partir des requêtes, jamais des entités.

| # | Pattern d'accès | Clé utilisée |
| --- | --- | --- |
| A1 | Récupérer un produit par id | `PK = PRODUCT#<id>`, `SK = META` |
| A2 | Récupérer un produit par slug (URL) | `GSI2PK = SLUG#<slug>` |
| A3 | Lister les produits d'une catégorie, triés | `GSI1PK = CATEGORY#<slug>`, `GSI1SK = PRICE#<pad>` |
| A4 | Lister tous les produits (accueil / listing) | `GSI1PK = PRODUCTS#ALL`, `GSI1SK = CREATED#<iso>` |
| A5 | Lister toutes les catégories | `PK = CATEGORY#ALL`, `SK begins_with CATEGORY#` |
| A6 | Lire le panier d'un utilisateur | `PK = USER#<id>`, `SK begins_with CART#` |
| A7 | Lire la wishlist d'un utilisateur | `PK = USER#<id>`, `SK begins_with WISH#` |
| A8 | Ajouter/MàJ une ligne de panier (anti-doublon) | `PutItem`/`UpdateItem` sur `SK = CART#<productId>` |
| A9 | Ajouter à la wishlist sans doublon | `PutItem` + `ConditionExpression attribute_not_exists(PK)` |
| A10 | Produits associés (même catégorie, ≠ produit courant) | A3 + filtre applicatif |
| A11 | Lire/créer le profil utilisateur | `PK = USER#<id>`, `SK = PROFILE` |

L'unicité du couple `PK`/`SK` est ce qui garantit l'anti-doublon demandé par le brief : le même
produit ne peut pas exister deux fois dans un panier, il ne peut qu'incrémenter sa quantité.

---

## Phase P0 : Fondations du dépôt

**Objectif** : un dépôt qui démarre, se lint, se teste et se commite proprement.
**Sortie de phase** : `npm run dev` affiche une page, `npm run lint` et `npm run typecheck` passent.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| P0.1 | ✅ Initialiser Next.js 16 + TS + Tailwind v4 dans le dépôt cloné | `create-next-app` avec App Router, `src/`, alias `@/*` ; `npm run dev` répond sur `:3000` | `lean-build`, `anthropic-skills:react-nextjs-development` |
| P0.2 | ✅ Durcir `tsconfig.json` | `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax` ; `npm run typecheck` vert | `anthropic-skills:react-nextjs-development` |
| P0.3 | ✅ ESLint + Prettier + `eslint-plugin-tailwindcss` | `npm run lint` vert, formatage déterministe | `lean-build` |
| P0.4 | ✅ Créer l'arborescence vide de la section 0 avec un `.gitkeep` par dossier | La structure de couches existe avant la première ligne de métier | `composition-patterns` |
| P0.5 | ✅ `lib/env.ts` : validation des variables d'environnement au boot via Zod | Démarrage en échec explicite si une variable manque ; aucun `process.env` brut ailleurs | `anthropic-skills:frontend-security-coder`, `anthropic-skills:backend-patterns` |
| P0.6 | ✅ `.env.example` + `.gitignore` durci (`.env*.local`, `.aws/`) | Aucun secret dans l'historique Git ; `git log -p` propre | `anthropic-skills:frontend-security-coder`, `/security-review` |
| P0.7 | ✅ Conventions Git : branches `feat/…`, `fix/…`, `docs/…` + Conventional Commits | Documenté dans le README ; première branche créée | `caveman-commit`, `finishing-a-development-branch` |
| P0.8 | ✅ `CLAUDE.md` de projet (stack, conventions, commandes) | Contexte persistant pour les sessions suivantes | `/init` |
| P0.9 | ✅ Premier commit + push sur `main` | Le dépôt distant n'est plus vide | `caveman-commit` |

---

## Phase P1 : Cadrage produit & direction artistique

**Objectif** : savoir exactement à quoi ressemble le site avant d'écrire du CSS.
**Sortie de phase** : tokens de design figés, inventaire des pages et des états validé.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| P1.1 | ✅ Cadrer le périmètre : ce qu'on fait, ce qu'on ne fait pas (pas de checkout, pas d'admin) | `ARCHITECTURE.md` § 1 : inclut la règle de coupe et les exclusions justifiées | `brainstorming`, `writing-plans` |
| P1.2 | ✅ Définir la niche du store + ton éditorial | `ARCHITECTURE.md` § 2 : audio et matériel d'écoute, ton factuel, un chiffre plutôt qu'un adjectif | `brainstorming`, `product-marketing` |
| P1.3 | ✅ Direction artistique : éviter le rendu « template IA » | `ARCHITECTURE.md` § 3 : parti pris « instrument », chaque axe justifié **et** ce qui a été écarté | `frontend-design`, `taste-skill`, `bencium-controlled-ux-designer` |
| P1.4 | ✅ Design tokens Tailwind v4 (`@theme`) : couleurs, typo, spacing, radius, z-index | `globals.css` : OKLCH, échelle typo fluide, un rayon par niveau de hiérarchie | `theme-factory`, `design:design-system` |
| P1.5 | ✅ Mode sombre (tokens redéfinis, pas de classes dupliquées) | `light-dark()` + `data-theme` ; **aucun `dark:` dans les composants**, vérifiable par `grep` | `theme-factory`, `design:design-system` |
| P1.6 | ✅ Inventaire exhaustif des écrans et de **chaque état** (idle / loading / empty / error / 404) | `ARCHITECTURE.md` § 5 : matrice 10 écrans × 4 états, checklist de P9 | `brainstorming`, `web-design-guidelines` |
| P1.7 | ✅ Parcours utilisateur des 3 flux critiques | `ARCHITECTURE.md` § 6 : trois diagrammes + le point de vérité de chaque parcours | `design:user-research`, `writing-plans` |
| P1.8 | ✅ Doctrine de motion : ce qui anime, ce qui n'anime jamais | `ARCHITECTURE.md` § 7 : 4 rôles, durées et courbes tokenisées, interdits explicites | `motion-doctrine`, `motion-design` |
| P1.9 | ✅ Micro-copy : libellés boutons, états vides, messages d'erreur | `ARCHITECTURE.md` § 8 : 9 textes figés, zéro « Une erreur est survenue » | `design:ux-copy`, `copywriting` |

---

## Phase P2 : Modèle de données & infrastructure DynamoDB

**Objectif** : la table existe, elle est peuplée, et le modèle est documenté.
**Sortie de phase** : `npm run db:seed` remplit une table interrogeable.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| **P2.0** | ✅ **Outillage** : dépendances (`@aws-sdk/client-dynamodb`, `lib-dynamodb`, `tsx`), harnais **Vitest**, scripts npm `test`, `db:create-table`, `db:seed` | `npm test` répond avant la première ligne de repository : P3 et P4 sont en TDD, le harnais ne peut pas arriver en P11 | `test-driven-development`, `lean-build` |
| **P2.0b** | ✅ **CI GitHub Actions** : `verify` + `test` sur chaque push | Remontée ici depuis P11.8 : 20 min de mise en place qui rattrapent les régressions pendant tout le reste du projet | `lean-build` |
| P2.1 | ✅ Formaliser les 11 patterns d'accès (section 0) avant toute clé | Tableau validé dans `docs/DATA-MODEL.md` | `brainstorming`, `anthropic-skills:backend-patterns` |
| P2.2 | ✅ Concevoir le single-table design : `PK`/`SK` + GSI1 (catégorie/listing) + GSI2 (slug) + attribut `expiresAt` | Chaque pattern d'accès résolu par une `Query`, jamais par un `Scan`. **La stratégie de recherche est tranchée ici** (chargement borné + filtrage applicatif), pas découverte en P4.6 | `anthropic-skills:backend-patterns`, `writing-plans` |
| P2.3 | ✅ Types du domaine (`types/`) + schémas Zod (`schemas/`) : User, Product, Category, CartItem, WishlistItem | Types inférés depuis Zod (`z.infer`), aucune duplication manuelle | `anthropic-skills:backend-patterns` |
| P2.4 | ✅ Fabriques de clés `lib/keys.ts` (`productKey`, `cartItemKey`…) | Aucune string de clé concaténée à la main hors de ce fichier | `composition-patterns`, `safe-refactor` |
| ~~P2.5~~ | ~~Compte AWS + utilisateur IAM dédié~~ → **déplacé en P14.1** | Le développement se fait sur DynamoDB Local. Créer le compte AWS maintenant n'apporterait ni coût ni sécurité utiles, seulement des clés à garder 10 phases durant | `anthropic-skills:frontend-security-coder`, `/security-review` |
| P2.6 | ✅ Client DynamoDB singleton `lib/dynamodb.ts` (DocumentClient, `removeUndefinedValues`) | Une seule instanciation, réutilisée à travers les invocations | `anthropic-skills:nodejs-backend-patterns` |
| P2.7 | ✅ `scripts/create-table.ts` : création idempotente table + GSI, `PAY_PER_REQUEST` | Relançable sans erreur ; documenté dans le README | `anthropic-skills:nodejs-backend-patterns`, `migration` |
| P2.8 | ✅ `scripts/seed.ts` : 6 à 8 catégories, 40+ produits réalistes (titre, description, prix, stock, images, tags) | `BatchWriteItem` par lots de 25 ; jeu de données crédible, pas de lorem ipsum | `anthropic-skills:nodejs-backend-patterns`, `copywriting` |
| P2.9 | ✅ Rédiger `docs/DATA-MODEL.md` : entités, clés, GSI, et les 4 opérations CRUD par entité | Exigence explicite du brief (« document how the application reads, creates, updates, deletes ») | `anthropic-skills:technical-writer`, `anthropic-skills:docs-writer` |
| P2.10 | ✅ **Prérequis** (et non plus « option ») : DynamoDB Local via Docker | P3.9 et P11.4 en dépendent, et c'est le chemin nominal de développement. `docker-compose.yml` versionné, `DYNAMODB_ENDPOINT` pris en compte par le client | `lean-build` |

---

## Phase P3 : Couche accès données (repositories)

**Objectif** : tout le DynamoDB est enfermé ici. Aucune commande SDK ailleurs dans le code.
**Sortie de phase** : chaque repository testé en intégration contre DynamoDB Local.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| P3.1 | ✅ `repositories/product.repository.ts` : `findById`, `findBySlug`, `findAll`, `findByCategory`, `findPage`, `findManyByIds` | Retourne des types du domaine, jamais des items bruts. **`search` et `findRelated` retirés d'ici** : P4.6 et P4.7 les décrivaient déjà comme de la logique métier, et la même règle ne vit pas dans deux couches | `test-driven-development`, `anthropic-skills:backend-patterns` |
| P3.2 | ✅ `repositories/category.repository.ts` : `findAll`, `findBySlug` | Tri par `position` en mémoire : un index pour ordonner huit éléments coûterait plus qu'il ne rapporte | `test-driven-development` |
| P3.3 | ✅ `repositories/user.repository.ts` : `findById`, `findOrCreate`, `touch`, `updateProfile`, `deleteAll` | Création implicite à la première visite | `test-driven-development` |
| P3.4 | ✅ `repositories/cart.repository.ts` : `list`, `incrementItem`, `setQuantity`, `removeItem`, `clear` | `upsertItem` utilise `UpdateExpression ADD quantity` → anti-doublon natif | `test-driven-development`, `anthropic-skills:backend-patterns` |
| P3.5 | ✅ `repositories/wishlist.repository.ts` : `list`, `add`, `remove`, `has` | `add` avec `ConditionExpression attribute_not_exists(PK)` → doublon impossible | `test-driven-development` |
| P3.6 | ✅ Mappers item DynamoDB ↔ entité du domaine | Le reste de l'application ignore l'existence de `PK`/`SK`/`GSI1PK` | `composition-patterns`, `safe-refactor` |
| P3.7 | ✅ Traduction des erreurs SDK en erreurs applicatives (`ConditionalCheckFailed` → `DuplicateError`, etc.) | Aucune erreur AWS brute ne remonte à l'UI | `anthropic-skills:backend-patterns`, `systematic-debugging` |
| P3.8 | ✅ Pagination par `LastEvaluatedKey` encodée en curseur opaque | Pas de `Scan` non borné, pas de pagination par offset | `anthropic-skills:backend-patterns` |
| P3.9 | ✅ Tests d'intégration des repositories contre DynamoDB Local (57 tests) | Chaque méthode couverte, y compris les cas d'erreur | `test-driven-development`, `verification-before-completion` |

---

## Phase P4 : Couche services (logique métier)

**Objectif** : le cœur évalué du projet. Pur, testable, sans dépendance à Next.js ni à HTTP.
**Sortie de phase** : couverture unitaire élevée sur les règles métier.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| P4.1 | ✅ `services/cart.service.ts`, ajout : borne de quantité (1..stock), fusion si déjà présent, produit inexistant rejeté | Règles écrites en tests **avant** le code | `test-driven-development`, `brainstorming` |
| P4.2 | ✅ Calcul du sous-total : arithmétique en centimes (entiers), jamais en flottants | `19.99 × 3` donne exactement `59.97` ; test dédié | `test-driven-development` |
| P4.3 | ✅ Enrichissement du panier : jointure lignes ↔ produits, gestion d'un produit supprimé entre-temps | Ligne orpheline signalée, pas de crash | `test-driven-development`, `systematic-debugging` |
| P4.4 | ✅ Récapitulatif panier : nombre d'articles, sous-total, éventuels frais/remises (transparents) | Une seule fonction de calcul, réutilisée par l'UI et l'API | `composition-patterns` |
| P4.5 | ✅ `services/wishlist.service.ts` : ajout idempotent, bascule, « déplacer vers le panier » | Ajouter deux fois n'est pas une erreur utilisateur | `test-driven-development` |
| P4.6 | ✅ `services/product.service.ts` : recherche (titre + tags), filtres (catégorie, prix min/max, dispo), tri (prix ↑↓, nouveauté) | Filtres combinables ; paramètres invalides → valeurs par défaut sûres | `test-driven-development`, `anthropic-skills:backend-patterns` |
| P4.7 | ✅ Algorithme de produits associés (même catégorie, tags partagés, exclusion du produit courant, limite 4) | Déterministe et testé | `test-driven-development` |
| P4.8 | ✅ `services/user.service.ts` : session, profil, rattachement panier/wishlist | Un utilisateur anonyme conserve son panier entre les visites | `test-driven-development` |
| P4.9 | ✅ Hiérarchie d'erreurs `lib/errors.ts` (livrée en P3, dont P3.7 dépendait) : `AppError` → `NotFoundError`, `ValidationError`, `ConflictError`, `DatabaseError` | Code d'erreur + statut HTTP portés par l'erreur, pas par l'appelant | `anthropic-skills:backend-patterns` |
| P4.10 | ✅ Revue de la logique métier avant de brancher l'UI | 5 défauts réels corrigés en TDD. Aucun service n'importe de repository : le câblage vit dans `services/index.ts` | `caveman-review`, `/code-review` |

---

## Phase P5 : Couche API & Server Actions

**Objectif** : exposer les services via HTTP et via des Server Actions, de façon cohérente.
**Sortie de phase** : API testable au `curl`, actions utilisables depuis un formulaire.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| P5.1 | ✅ Enveloppe de réponse standard `{ success, data, error }` + helper `handleRoute` | Toutes les routes ont la même forme, y compris en erreur | `anthropic-skills:backend-patterns`, `composition-patterns` |
| P5.2 | ✅ `GET /api/products` : pagination, `?q=`, `?category=`, `?minPrice=`, `?maxPrice=`, `?sort=` | Query params validés par Zod ; 400 explicite si invalides | `anthropic-skills:write-api-reference`, `test-driven-development` |
| P5.3 | ✅ `GET /api/products/[slug]` | 404 structuré si absent. **Slug et non identifiant** : c'est ce que porte l'URL publique, donc ce qu'un client a sous la main | `test-driven-development` |
| P5.4 | ✅ `GET /api/categories` | Liste triée | `test-driven-development` |
| P5.5 | ✅ `GET/POST/PATCH/DELETE /api/cart` | CRUD complet, corps validés, codes HTTP corrects (200/201/204/400/404/409) | `anthropic-skills:write-api-reference`, `test-driven-development` |
| P5.6 | ✅ `GET/POST/DELETE /api/wishlist` | **Pas de 409 sur doublon** : l'ajout est idempotent, donc 200 avec `added: false`. Un favori posé deux fois n'est pas un échec pour le visiteur | `test-driven-development` |
| P5.7 | ✅ Server Actions `actions/cart.ts` et `actions/wishlist.ts` (`"use server"`) | `revalidatePath` ciblé ; retour typé `ActionResult<T>` | `anthropic-skills:react-nextjs-development`, `react-best-practices` |
| P5.8 | ✅ **`proxy.ts`** et non `middleware.ts`, déprécié en Next 16. Cookie httpOnly signé en HMAC, `SameSite=Lax`, posé avant tout rendu | Vérifié au curl : aucun identifiant accepté depuis le client, un cookie falsifié produit une session neuve | `anthropic-skills:frontend-security-coder` |
| P5.9 | ✅ Gestion d'erreurs centralisée : mapping `AppError` → statut HTTP, logs serveur, message safe côté client | Aucune stack trace ni nom de table exposés | `anthropic-skills:backend-patterns`, `/security-review` |
| P5.10 | ✅ Garde-fous d'abus : bornes de pagination, limite de taille de corps, limite de quantité | Une requête hostile ne peut pas faire exploser la facture DynamoDB | `anthropic-skills:frontend-security-coder` |
| P5.11 | ✅ Documenter l'API dans `docs/API.md` (endpoints, params, exemples de réponse) | Sert aussi de section README | `anthropic-skills:write-api-reference` |
| P5.12 | ✅ Tests d'intégration des routes (21 tests) | Services **réels** plutôt que mockés : seul `next/headers` est remplacé, ce qui rend l'isolation entre sessions réellement vérifiable | `test-driven-development`, `verification-before-completion` |

---

## Phase P6 : Design system & composants UI

**Objectif** : une bibliothèque de composants cohérente, avant d'assembler les pages.
**Sortie de phase** : chaque primitive existe dans tous ses états.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| P6.1 | Choisir la stratégie composants (primitives maison vs headless type Radix) | Décision tranchée et justifiée, pas un mélange | `pick-ui-library`, `brainstorming` |
| P6.2 | Primitives `ui/` : Button, Input, Select, Badge, Card, Skeleton, Dialog, Toast | API par variantes (`variant`/`size`), **jamais** une prolifération de props booléennes | `composition-patterns`, `emil-design-eng` |
| P6.3 | Notifications via Sonner (ajout panier, erreurs) | Un seul `<Toaster>`, positionnement et thème cohérents | `ask-sonner` |
| P6.4 | `layout/Header` : logo, nav catégories, recherche, compteurs panier/wishlist | Compteurs réactifs après action serveur | `composition-patterns`, `frontend-design` |
| P6.5 | `layout/MobileNav` : drawer, verrou de scroll, fermeture au changement de route | Aucun piège de focus, `Escape` fonctionne | `web-design-guidelines`, `design:accessibility-review` |
| P6.6 | `product/ProductCard` : image, titre, prix, badge stock, bouton wishlist | Hauteur stable, pas de décalage de layout (CLS) | `emil-design-eng`, `react-best-practices` |
| P6.7 | `product/ProductGrid` + `ProductGallery` (détail) | Responsive 1/2/3/4 colonnes | `frontend-design` |
| P6.8 | `cart/QuantityStepper` : mise à jour optimiste, bornes, état désactivé | Pas de rafale de requêtes au clic répété (debounce) | `react-best-practices`, `composition-patterns` |
| P6.9 | `feedback/` : `EmptyState`, `ErrorState`, `LoadingSkeleton`, génériques et réutilisés partout | Zéro état vide écrit en dur dans une page | `composition-patterns`, `design:ux-copy` |
| P6.10 | Revue de design des composants avant assemblage | Rendu non générique, détails invisibles soignés | `design:design-critique`, `taste-skill`, `apple-design` |

---

## Phase P7 : Storefront (assemblage des pages)

**Objectif** : le site navigable de bout en bout avec de vraies données.
**Sortie de phase** : parcours complet accueil → catégorie → produit → panier sans impasse.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| P7.1 | `layout.tsx` racine : métadonnées, polices, providers, `<Toaster>`, header/footer | Polices via `next/font`, aucun FOUT | `anthropic-skills:react-nextjs-development` |
| P7.2 | Accueil : hero, catégories en vedette, nouveautés, bandeau valeur | Server Component, données réelles issues de DynamoDB. Remplace la planche de tokens provisoire. **`remotePatterns` restreint dès ce premier usage d'image** (anticipe P15.11 : le laisser à `**` pendant 8 phases est une SSRF ouverte) | `frontend-design`, `anthropic-skills:react-nextjs-development` |
| P7.3 | Listing produits : grille + barre de filtres + tri + pagination | Filtres portés par l'URL (`searchParams`) → partageable et rechargeable | `anthropic-skills:react-nextjs-development`, `react-best-practices` |
| P7.4 | Recherche : champ dans le header + page de résultats, debounce, requête reflétée dans l'URL | Résultat vide → `EmptyState` avec suggestions, pas une page blanche | `react-best-practices`, `design:ux-copy` |
| P7.5 | Page catégorie `[slug]` : bannière, description, produits filtrés | `generateStaticParams` sur les catégories | `anthropic-skills:react-nextjs-development` |
| P7.6 | Page produit `[slug]` : galerie, prix, stock, description, tags, ajout panier, bouton wishlist | Slug inconnu → `notFound()` | `frontend-design`, `anthropic-skills:react-nextjs-development` |
| P7.7 | Bloc « Produits associés » sur la page produit | Alimenté par `findRelated` (P4.7) | `composition-patterns` |
| P7.8 | Fil d'Ariane (breadcrumb) contextuel | Accueil › Catégorie › Produit | `web-design-guidelines` |
| P7.9 | `not-found.tsx` global soigné (recherche + liens catégories) | Exigence explicite du brief | `design:ux-copy`, `frontend-design` |
| P7.10 | Footer : liens, mentions, réassurance | Cohérent avec la DA | `frontend-design` |

---

## Phase P8 : Panier & Wishlist (expérience complète)

**Objectif** : les deux fonctionnalités métier centrales, sans faille.
**Sortie de phase** : tous les cas limites du brief traités.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| P8.1 | Page panier : lignes, images, prix unitaire, quantité, sous-total par ligne, récapitulatif | Total recalculé côté serveur, jamais côté client | `anthropic-skills:react-nextjs-development` |
| P8.2 | Modification de quantité (stepper + saisie directe), plancher 1, plafond stock | Mise à jour optimiste + rollback en cas d'échec serveur | `react-best-practices`, `composition-patterns` |
| P8.3 | Suppression de ligne + annulation possible (toast « Annuler ») | Pas de suppression irréversible sans filet | `ask-sonner`, `design:ux-copy` |
| P8.4 | Panier vide : `EmptyState` avec appel à l'action vers le listing | Exigence explicite du brief | `design:ux-copy` |
| P8.5 | Ajout depuis la carte produit **et** depuis la page produit | Anti-doublon vérifié : le même produit incrémente sa quantité | `test-driven-development` |
| P8.6 | Page wishlist : grille, retrait, « déplacer vers le panier » | Déplacement = ajout panier + retrait wishlist, atomique côté service | `test-driven-development` |
| P8.7 | Bouton wishlist en bascule (icône remplie/vide) sur tous les points d'entrée | État réel lu depuis la base, pas seulement local | `react-best-practices` |
| P8.8 | Persistance entre sessions via le cookie de session | Fermer/rouvrir le navigateur conserve panier et wishlist | `test-driven-development`, `verification-before-completion` |
| P8.9 | Cas limites : produit en rupture, produit supprimé, quantité > stock, action concurrente | Chaque cas affiche un message clair, aucun crash | `systematic-debugging`, `investigate-first` |
| P8.10 | Animations d'ajout (compteur header, entrée/sortie de ligne) | Discrètes, interruptibles, `prefers-reduced-motion` respecté | `animate`, `motion-design` |

---

## Phase P9 : États, résilience, responsive, accessibilité

**Objectif** : cocher une par une les exigences « Application Experience » du brief.
**Sortie de phase** : la matrice écran × état de P1.6 est intégralement verte.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| P9.1 | `loading.tsx` + `<Suspense>` par route avec skeletons fidèles à la mise en page finale | Aucun spinner plein écran ; pas de saut de layout | `anthropic-skills:react-nextjs-development`, `emil-design-eng` |
| P9.2 | `error.tsx` par segment + boundary global, avec bouton « Réessayer » | Une panne DynamoDB n'affiche pas une page blanche | `anthropic-skills:react-nextjs-development`, `systematic-debugging` |
| P9.3 | États vides pour : listing filtré, recherche, panier, wishlist, catégorie sans produit | Chacun propose une action de sortie | `design:ux-copy`, `composition-patterns` |
| P9.4 | Validation de formulaire côté client **et** serveur (mêmes schémas Zod) | Messages d'erreur au champ, pas seulement en haut de page | `test-driven-development`, `anthropic-skills:frontend-security-coder` |
| P9.5 | Passe responsive 360 / 768 / 1024 / 1440 px | Aucun scroll horizontal, cibles tactiles ≥ 44 px | `web-design-guidelines`, `frontend-design` |
| P9.6 | Accessibilité : landmarks, focus visible, navigation clavier complète, alt d'images, contrastes AA | Parcours entier réalisable au clavier seul | `design:accessibility-review`, `web-design-guidelines` |
| P9.7 | Audit des animations : rien de gratuit, rien qui bloque l'interaction | Motion justifiée ou supprimée | `review-animations`, `improve-animations` |
| P9.8 | Repérer les endroits manquant de feedback perçu | Chaque action a une réponse < 100 ms | `find-animation-opportunities`, `emil-design-eng` |

---

## Phase P10 : Performance & SEO

**Objectif** : un site qui charge vite et qui est indexable.
**Sortie de phase** : Lighthouse ≥ 90 sur les quatre axes, pages produit riches en métadonnées.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| P10.1 | Stratégie de rendu par route (statique / dynamique / revalidation ISR) | Documentée dans `ARCHITECTURE.md`, cohérente avec la fraîcheur des données | `anthropic-skills:vercel-react-best-practices`, `react-best-practices` |
| P10.2 | Optimisation images : `next/image`, `sizes`, `priority` sur le LCP, formats modernes | LCP < 2,5 s sur mobile simulé | `anthropic-skills:vercel-react-best-practices` |
| P10.3 | Réduire le JS client : `"use client"` le plus bas possible dans l'arbre | Les pages restent majoritairement Server Components | `react-best-practices`, `composition-patterns` |
| P10.4 | Métadonnées dynamiques (`generateMetadata`) : titre, description, Open Graph par produit | Partage social correct | `seo-audit`, `anthropic-skills:react-nextjs-development` |
| P10.5 | Données structurées JSON-LD : `Product`, `BreadcrumbList`, `ItemList` | Validées par le Rich Results Test | `schema` |
| P10.6 | `sitemap.ts` + `robots.ts` | Générés depuis la base | `seo-audit` |
| P10.7 | Audit Lighthouse + corrections | Score ≥ 90 perf / a11y / best practices / SEO | `seo-audit`, `verification-before-completion` |

---

## Phase P11 : Tests

**Objectif** : prouver que la logique métier tient. C'est la dernière étape du workflow exigé.
**Sortie de phase** : `npm test` vert en CI.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| ~~P11.1~~ | ~~Mise en place Vitest~~ → **déplacé en P2.0** | Le harnais doit exister avant P3/P4, qui se font en TDD. Il ne reste ici que l'ajout de Testing Library pour P11.6 | `test-driven-development` |
| P11.2 | Tests unitaires des services (panier, wishlist, produits, sous-total) | Cas nominaux **et** cas limites ; c'est le cœur de la note | `test-driven-development` |
| P11.3 | Tests unitaires des utilitaires (formatage prix, slug, curseurs de pagination) | 100 % des fonctions pures couvertes | `test-driven-development` |
| P11.4 | Tests d'intégration repositories contre DynamoDB Local | Table créée/détruite par le harnais de test | `test-driven-development` |
| P11.5 | Tests des routes API (nominal + erreurs) | Codes HTTP et enveloppes vérifiés | `test-driven-development` |
| P11.6 | Tests de composants : ProductCard, QuantityStepper, EmptyState | Rendu et interactions | `test-driven-development` |
| P11.7 | E2E Playwright : parcours achat, recherche+filtre, wishlist→panier | Les 3 parcours critiques passent | `test-driven-development`, `/run` |
| ~~P11.8~~ | ~~CI GitHub Actions~~ → **déplacée en P2.0b** | Il ne reste ici que l'ajout du job Playwright, qui n'existe qu'à partir de P11.7 | `lean-build` |
| P11.9 | Débogage des échecs résiduels | Cause racine identifiée, pas de test désactivé | `systematic-debugging`, `investigate-first` |

---

## Phase P12 : Qualité, revue & sécurité

**Objectif** : le code est prêt à être lu par un évaluateur.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| P12.1 | Revue complète du diff, phase par phase | Findings traités ou explicitement écartés | `/code-review`, `caveman-review`, `receiving-code-review` |
| P12.2 | Passe de simplification : duplication, abstractions inutiles, code mort | Moins de code, même comportement | `/simplify`, `safe-refactor` |
| P12.3 | Revue de sécurité : secrets, validation des entrées, IAM, exposition d'erreurs, en-têtes | Aucun secret dans l'historique ; IAM au moindre privilège | `/security-review`, `anthropic-skills:frontend-security-coder` |
| P12.4 | Vérifier le respect de la règle de dépendance entre couches | Aucun import de repository depuis un composant | `safe-refactor`, `composition-patterns` |
| P12.5 | Nettoyage de l'historique Git : messages conventionnels, pas de commit « wip » | `git log --oneline` lisible de bout en bout | `caveman-commit`, `finishing-a-development-branch` |
| P12.6 | Vérification finale contre le brief, ligne par ligne | Chaque puce de `BRIEF.md` pointée vers son implémentation | `verification-before-completion`, `verify-and-stop` |

---

## Phase P13 : Documentation

**Objectif** : le README est un livrable noté, avec 8 sections imposées.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| P13.1 | README §1 Présentation du projet | Ce que c'est, pour qui, démo en une phrase | `anthropic-skills:docs-writer`, `copywriting` |
| P13.2 | README §2 Fonctionnalités | Liste alignée sur le brief, avec captures | `anthropic-skills:docs-writer` |
| P13.3 | README §3 Stack technique | Versions incluses, choix justifiés | `anthropic-skills:technical-writer` |
| P13.4 | README §4 Structure du projet | Arbre commenté, rôle de chaque dossier | `anthropic-skills:technical-writer` |
| P13.5 | README §5 Architecture | Schéma de flux + règle de dépendance des couches | `anthropic-skills:technical-writer`, `artifact-diagramming` |
| P13.6 | README §6 Configuration DynamoDB | Création de table, GSI, seed, IAM, modèle de données + CRUD | `anthropic-skills:technical-writer` |
| P13.7 | README §7 Variables d'environnement | Tableau nom / rôle / exemple ; renvoi vers `.env.example` | `anthropic-skills:docs-writer` |
| P13.8 | README §8 Installation | De `git clone` à `npm run dev`, testé sur une machine vierge | `anthropic-skills:docs-writer`, `verification-before-completion` |
| P13.9 | Relecture finale de toute la documentation | Ton cohérent, zéro faute, zéro lien mort | `copy-editing` |

---

## Phase P14 : Déploiement & soumission

**Objectif** : livrer les quatre éléments exigés par le dashboard de stage.

| ID | Tâche | Livrable / critère d'acceptation | Skills |
| --- | --- | --- | --- |
| P14.1 | Compte AWS, table DynamoDB de production + utilisateur IAM dédié, politique au moindre privilège (ex-P2.5) | Séparée de la table de dev ; jamais `AdministratorAccess` ; clés en variables Vercel uniquement | `anthropic-skills:frontend-security-coder`, `/security-review` |
| P14.2 | Déploiement Vercel, variables d'environnement configurées | Build de production vert | `anthropic-skills:vercel-react-best-practices` |
| P14.3 | Seed de la base de production | Le site live affiche un vrai catalogue | `lean-build` |
| P14.4 | Vérification du site live : les 3 parcours critiques en conditions réelles | Testé sur mobile physique et desktop | `/run`, `verify-and-stop` |
| P14.5 | Captures d'écran : accueil, listing, filtres, produit, panier rempli, panier vide, wishlist, 404, vue mobile | Rangées dans `docs/screenshots/`, référencées dans le README | `image` |
| P14.6 | Finalisation du dépôt : description, topics, README affiché correctement sur GitHub | Page d'accueil du repo présentable | `finishing-a-development-branch` |
| P14.7 | Soumission : lien GitHub + lien live + README + captures | Les 4 éléments du brief fournis | `verification-before-completion` |

---

## Extensions au-delà du brief (P15 → P17)

> **Statut de ces trois phases** : le brief n'exige ni durcissement sécurité avancé, ni conformité
> RGPD, ni polish esthétique poussé. Ce sont des **différenciateurs** : ils transforment un projet
> de stage correct en projet qui ressemble vraiment à de la production. Ils se mènent **après M4**
> (produit navigable), jamais avant, car durcir une application qui ne marche pas encore est du temps
> perdu.
>
> Chaque tâche porte un marqueur de priorité :
> **[E]** essentiel même pour un projet de stage · **[R]** recommandé · **[D]** démonstratif
> (montre la compétence, dépasse le besoin réel).

---

## Phase P15 : Sécurité applicative approfondie

**Objectif** : défense en profondeur. Chaque couche suppose que la précédente a été contournée.
**Sortie de phase** : aucune faille dans l'OWASP Top 10 applicable à ce périmètre.
**Prérequis** : P12.3 (revue de sécurité de base) déjà passée.

### P15.a : Contrôle d'accès & isolation des données

| ID | Tâche | Livrable / critère d'acceptation | Prio | Skills |
| --- | --- | --- | --- | --- |
| P15.1 | **Anti-IDOR sur panier et wishlist** : toute opération dérive l'identifiant utilisateur du cookie serveur, jamais d'un paramètre client | Un `POST /api/cart` portant `userId` d'autrui est ignoré, pas exécuté ; test automatisé dédié | **[E]** | `anthropic-skills:frontend-security-coder`, `test-driven-development` |
| P15.2 | **Vérification d'appartenance systématique** dans les services (pas dans les routes) | Impossible d'écrire un endpoint qui oublie le contrôle : le service l'impose | **[E]** | `anthropic-skills:backend-patterns`, `safe-refactor` |
| P15.3 | **Rotation de session** à chaque élévation d'état (création de profil, rattachement de panier) | Pas de fixation de session : l'identifiant change, le panier suit | **[R]** | `anthropic-skills:frontend-security-coder` |
| P15.4 | **Cookie durci** : `httpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age` explicite, préfixe `__Host-` | Inspecté dans le navigateur, tous les flags présents en production | **[E]** | `anthropic-skills:frontend-security-coder` |
| P15.5 | **Identifiant de session non devinable** : `crypto.randomUUID()` ou 32 octets aléatoires, jamais un compteur | Entropie ≥ 128 bits ; aucune séquence prédictible | **[E]** | `anthropic-skills:nodejs-backend-patterns` |
| P15.6 | **Signature du cookie de session** (HMAC avec secret serveur) pour détecter la falsification | Un cookie modifié est rejeté et purgé, pas interprété | **[R]** | `anthropic-skills:frontend-security-coder` |

### P15.b : Entrées, sorties & injection

| ID | Tâche | Livrable / critère d'acceptation | Prio | Skills |
| --- | --- | --- | --- | --- |
| P15.7 | **Validation Zod à la frontière**, sans exception : query params, corps, `FormData` des Server Actions, cookies | Aucune donnée non validée n'atteint un service ; `z.strictObject` pour rejeter les champs inconnus | **[E]** | `anthropic-skills:frontend-security-coder`, `test-driven-development` |
| P15.8 | **Injection NoSQL DynamoDB** : `ExpressionAttributeValues` partout, zéro concaténation dans une `FilterExpression` | Revue ciblée : `grep` sur les expressions construites par template string | **[E]** | `anthropic-skills:backend-patterns`, `/security-review` |
| P15.9 | **XSS** : bannir `dangerouslySetInnerHTML` ; si une description produit doit accepter du HTML, passer par une sanitisation allowlist (DOMPurify côté serveur) | Test avec charge `<img onerror>` dans un champ produit : rendu inerte | **[E]** | `anthropic-skills:frontend-security-coder` |
| P15.10 | **Open redirect** : toute redirection issue d'un paramètre (`?next=`) validée contre une allowlist de chemins internes | Redirection externe impossible | **[R]** | `anthropic-skills:frontend-security-coder` |
| P15.11 | **SSRF via `next/image`** : `remotePatterns` restreint à des hôtes précis, jamais `hostname: '**'` | Un domaine non listé renvoie 400 | **[E]** | `anthropic-skills:frontend-security-coder` |
| P15.12 | **Prototype pollution / désérialisation** : pas de `JSON.parse` sur entrée non validée avant passage Zod | Ordre parse → valide → utiliser, jamais parse → utiliser | **[R]** | `anthropic-skills:nodejs-backend-patterns` |

### P15.c : En-têtes, CSP & transport

| ID | Tâche | Livrable / critère d'acceptation | Prio | Skills |
| --- | --- | --- | --- | --- |
| P15.13 | **Content-Security-Policy à base de nonce** via middleware (`script-src 'nonce-…' 'strict-dynamic'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`) | Zéro violation en console sur toutes les pages ; pas de `unsafe-inline` sur `script-src` | **[R]** | `anthropic-skills:frontend-security-coder`, `anthropic-skills:react-nextjs-development` |
| P15.14 | **Rodage CSP en `Report-Only`** avant application, avec endpoint de collecte des rapports | Aucune régression fonctionnelle au passage en mode bloquant | **[D]** | `anthropic-skills:frontend-security-coder`, `systematic-debugging` |
| P15.15 | **En-têtes de sécurité complets** : `Strict-Transport-Security` (avec `preload`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimale, `X-Frame-Options: DENY` | Note A sur securityheaders.com | **[E]** | `anthropic-skills:frontend-security-coder` |
| P15.16 | **CORS** : les routes API ne sont pas ouvertes au monde ; origine restreinte au domaine du site | Un `fetch` cross-origin depuis un autre domaine échoue | **[R]** | `anthropic-skills:backend-patterns` |
| P15.17 | **CSRF** : vérification d'origine sur les mutations (`Origin`/`Sec-Fetch-Site`) en complément de `SameSite` | Défense en profondeur : le cookie seul ne suffit pas comme preuve d'intention | **[R]** | `anthropic-skills:frontend-security-coder` |

### P15.d : Abus, disponibilité & coût

| ID | Tâche | Livrable / critère d'acceptation | Prio | Skills |
| --- | --- | --- | --- | --- |
| P15.18 | **Rate limiting** par IP + par session sur les mutations et la recherche (Upstash Redis ou compteur DynamoDB avec TTL) | 429 avec `Retry-After` ; seuils documentés | **[R]** | `anthropic-skills:backend-patterns`, `anthropic-skills:nodejs-backend-patterns` |
| P15.19 | **Plafonds métier** : quantité max par ligne, nombre max de lignes de panier, taille max de wishlist | Un script d'abus ne peut pas créer 10 000 items | **[E]** | `test-driven-development` |
| P15.20 | **Bornes de pagination** : `limit` plafonné côté serveur, `Scan` interdit hors scripts d'administration | Coût DynamoDB par requête borné et prévisible | **[E]** | `anthropic-skills:backend-patterns` |
| P15.21 | **Limite de taille de corps de requête** + timeout sur les handlers | Un corps de 10 Mo est rejeté avant traitement | **[R]** | `anthropic-skills:backend-patterns` |
| P15.22 | **Budget AWS avec alerte** (seuil mensuel, notification e-mail) | Filet de sécurité financier en cas d'abus ou de boucle | **[E]** | `anthropic-skills:nodejs-backend-patterns` |

### P15.e : Secrets, IAM & chaîne d'approvisionnement

| ID | Tâche | Livrable / critère d'acceptation | Prio | Skills |
| --- | --- | --- | --- | --- |
| P15.23 | **Politique IAM chirurgicale** : actions limitées (`GetItem`, `Query`, `PutItem`, `UpdateItem`, `DeleteItem`, `BatchWriteItem`), ressources limitées à la table + ses index, **aucun** `dynamodb:Scan` ni `DeleteTable` en production | Politique JSON versionnée dans `docs/`, testée par refus effectif | **[E]** | `anthropic-skills:frontend-security-coder`, `/security-review` |
| P15.24 | **Utilisateurs IAM séparés** dev / prod, clés distinctes, rotation documentée | Une fuite de clé de dev ne touche pas la production | **[E]** | `anthropic-skills:frontend-security-coder` |
| P15.25 | **Scan de secrets** dans l'historique Git (`gitleaks` en pre-commit + en CI) | Historique vérifié de bout en bout, hook actif | **[E]** | `lean-build`, `/security-review` |
| P15.26 | **Audit de dépendances** : `npm audit` en CI, Dependabot activé, `npm ci` avec lockfile figé | Aucune vulnérabilité haute ou critique en `main` | **[R]** | `lean-build` |
| P15.27 | **CodeQL** (GitHub Advanced Security, gratuit sur dépôt public) | Analyse statique à chaque push | **[D]** | `lean-build` |
| P15.28 | **Vérification de la surface serveur→client** : aucune variable sensible préfixée `NEXT_PUBLIC_`, aucun secret dans le bundle | `grep` du build client sur les motifs de clés AWS : zéro occurrence | **[E]** | `anthropic-skills:frontend-security-coder`, `verification-before-completion` |

### P15.f : Observabilité & réponse

| ID | Tâche | Livrable / critère d'acceptation | Prio | Skills |
| --- | --- | --- | --- | --- |
| P15.29 | **Logs structurés** (JSON, niveau, requestId de corrélation) : **sans donnée personnelle** | Un log ne contient jamais d'identifiant de session en clair ni d'e-mail | **[R]** | `anthropic-skills:nodejs-backend-patterns` |
| P15.30 | **Masquage des erreurs** : message générique côté client, détail complet côté serveur, corrélé par requestId | Aucune stack trace, nom de table ou requête DynamoDB exposés | **[E]** | `anthropic-skills:backend-patterns`, `systematic-debugging` |
| P15.31 | **Tests de sécurité automatisés** : suite dédiée (IDOR, validation, en-têtes, rate limit) | Intégrée à la CI, verte | **[D]** | `test-driven-development`, `/security-review` |
| P15.32 | **`SECURITY.md`** : périmètre, modèle de menace résumé, procédure de signalement | Montre la maturité du raisonnement, pas seulement du code | **[D]** | `anthropic-skills:technical-writer` |
| P15.33 | **Revue de sécurité finale** du diff complet des phases P15 | Findings traités ou écartés avec justification écrite | **[E]** | `/security-review`, `caveman-review` |

---

## Phase P16 : RGPD & privacy by design

**Objectif** : traiter la donnée utilisateur comme si le site était réellement exploité en Europe.
**Sortie de phase** : droits des personnes exerçables dans l'application, documentation conforme.

> **Point de droit qui détermine tout le reste** : le panier anonyme repose sur un UUID de session.
> Un identifiant en ligne rattaché à un comportement constitue une **donnée personnelle** au sens du
> RGPD (art. 4.1 et considérant 30), même sans nom ni e-mail. Le RGPD s'applique donc **dès la
> première visite**, et pas seulement si l'on ajoute un compte utilisateur.
>
> **Corollaire favorable** : le cookie de panier est *strictement nécessaire* au service demandé par
> l'utilisateur. Il est **exempté de consentement** (directive ePrivacy, art. 5.3, et doctrine CNIL).
> Il faut en **informer**, pas en **demander l'autorisation**. Un bandeau cookies n'est requis que si
> l'on ajoute des traceurs non essentiels : raison de plus pour les éviter (P16.12).

### P16.a : Cartographie & base légale

| ID | Tâche | Livrable / critère d'acceptation | Prio | Skills |
| --- | --- | --- | --- | --- |
| P16.1 | **Inventaire des données traitées** : quelle donnée, où, pourquoi, combien de temps, qui y accède | Tableau dans `docs/PRIVACY.md` : fondation de tout le reste | **[E]** | `anthropic-skills:technical-writer`, `brainstorming` |
| P16.2 | **Base légale par traitement** : panier/wishlist = exécution du contrat (art. 6.1.b) ; sécurité/anti-abus = intérêt légitime (art. 6.1.f) ; analytics = consentement (art. 6.1.a), donc évité | Chaque traitement a une base légale explicite et défendable | **[R]** | `anthropic-skills:technical-writer` |
| P16.3 | **Registre des traitements simplifié** (art. 30) | Note d'honnêteté à inclure : une structure < 250 salariés en est largement exemptée ; le produire ici est **démonstratif** | **[D]** | `anthropic-skills:technical-writer` |
| P16.4 | **Liste des sous-traitants** : Vercel (hébergement), AWS (base), + tout service tiers | Rôles, localisation des données, renvoi vers leurs DPA | **[R]** | `anthropic-skills:docs-writer` |
| P16.5 | **Résidence des données en UE** : table DynamoDB en `eu-west-3` (Paris), fonctions Vercel forcées sur une région UE (`cdg1`/`fra1`) | Aucun transfert hors UE par défaut ; vérifié dans les consoles | **[R]** | `anthropic-skills:vercel-react-best-practices` |

### P16.b : Minimisation & cycle de vie

| ID | Tâche | Livrable / critère d'acceptation | Prio | Skills |
| --- | --- | --- | --- | --- |
| P16.6 | **Minimisation** (art. 5.1.c) : revue champ par champ du modèle de données, suppression de tout ce qui n'a pas d'usage prouvé | Aucun champ « au cas où » ; pas de collecte d'IP hors anti-abus | **[E]** | `safe-refactor`, `anthropic-skills:backend-patterns` |
| P16.7 | **Limitation de conservation** (art. 5.1.e) via **TTL DynamoDB natif** : attribut `expiresAt` (epoch secondes) sur les items de session, panier abandonné et wishlist | Purge automatique par AWS, sans job applicatif ; durées documentées (ex. 90 j d'inactivité) | **[R]** | `anthropic-skills:backend-patterns`, `anthropic-skills:nodejs-backend-patterns` |
| P16.8 | **Rafraîchissement du TTL** à chaque interaction : un panier actif ne doit pas expirer sous l'utilisateur | Testé : activité en J+80 repousse l'échéance | **[R]** | `test-driven-development` |
| P16.9 | **Rétention des logs** bornée et documentée (ex. 30 j pour les logs applicatifs, 6 mois pour la sécurité) | Configurée côté Vercel/AWS, pas seulement écrite | **[D]** | `anthropic-skills:nodejs-backend-patterns` |
| P16.10 | **Pseudonymisation dans les logs** : hachage des identifiants de session avant écriture | Un log exfiltré ne permet pas de rejouer une session | **[D]** | `anthropic-skills:frontend-security-coder` |

### P16.c : Droits des personnes (art. 15 à 20)

| ID | Tâche | Livrable / critère d'acceptation | Prio | Skills |
| --- | --- | --- | --- | --- |
| P16.11 | **Page `/privacy/my-data`** : l'utilisateur voit exactement ce que le site sait de lui | Transparence rendue tangible, pas seulement textuelle, très parlant en démo | **[R]** | `frontend-design`, `design:ux-copy` |
| P16.12 | **Droit d'accès + portabilité** (art. 15 & 20) : export JSON de toutes les données de la session | Bouton « Télécharger mes données » → fichier structuré et lisible | **[R]** | `anthropic-skills:backend-patterns`, `test-driven-development` |
| P16.13 | **Droit à l'effacement** (art. 17) : suppression réelle de tous les items `USER#<id>` + purge du cookie | Confirmation explicite requise ; vérifié en base après coup, pas seulement en UI | **[E]** | `test-driven-development`, `verification-before-completion` |
| P16.14 | **Droit de rectification** (art. 16) : édition des données de profil | Cohérent avec « user data management » du brief | **[R]** | `test-driven-development` |
| P16.15 | **Point de contact** pour l'exercice des droits + délai de réponse annoncé (1 mois, art. 12.3) | Présent dans la politique de confidentialité | **[R]** | `anthropic-skills:docs-writer` |

### P16.d : Transparence & interface

| ID | Tâche | Livrable / critère d'acceptation | Prio | Skills |
| --- | --- | --- | --- | --- |
| P16.16 | **Politique de confidentialité** rédigée en langage clair (art. 12.1), pas en jargon juridique copié-collé | Lisible en 3 minutes ; chaque affirmation vraie pour *cette* application | **[E]** | `copywriting`, `copy-editing`, `anthropic-skills:technical-writer` |
| P16.17 | **Bandeau d'information cookies** (information, pas consentement, puisque tout est strictement nécessaire) : discret, non bloquant, mémorisé | Pas de dark pattern, pas de mur, pas de « Accepter » démesuré face à « Refuser » | **[R]** | `popups`, `design:ux-copy`, `web-design-guidelines` |
| P16.18 | **Si analytics ajouté** : solution sans cookie ni donnée personnelle (Plausible, Umami self-hosted) plutôt que GA4 | Évite le consentement **et** les transferts hors UE ; décision documentée | **[D]** | `analytics` |
| P16.19 | **Privacy by default** (art. 25.2) : aucune option intrusive activée d'office | Vérifié sur chaque réglage exposé | **[R]** | `design:design-critique` |
| P16.20 | **Chiffrement** : au repos (DynamoDB, actif par défaut, montée en CMK KMS possible) et en transit (HTTPS strict, HSTS) | État documenté dans `PRIVACY.md` | **[R]** | `anthropic-skills:frontend-security-coder` |
| P16.21 | **Procédure de violation de données** : détection, évaluation, notification sous 72 h (art. 33) | Une page dans `SECURITY.md` ; démontre la compréhension du cycle complet | **[D]** | `anthropic-skills:technical-writer` |
| P16.22 | **Tests des parcours RGPD** : export, effacement, expiration TTL | Suite automatisée, car la conformité qui n'est pas testée n'existe pas | **[R]** | `test-driven-development`, `verification-before-completion` |

---

## Phase P17 : Esthétique & finition

**Objectif** : sortir du rendu « template généré ». C'est ce qui se voit en premier à l'évaluation.
**Sortie de phase** : une identité visuelle propre, une matière, un mouvement qui a du sens.
**Prérequis** : P6 à P9 terminées. On polit un produit qui fonctionne, pas une maquette.

### P17.a : Identité & direction artistique affirmée

| ID | Tâche | Livrable / critère d'acceptation | Prio | Skills |
| --- | --- | --- | --- | --- |
| P17.1 | **Explorer 5 à 10 directions visuelles isolées**, construites uniquement avec typo, couleur et espace : puis en choisir une et s'y tenir | Le choix est un acte délibéré, pas la première idée retenue par défaut | **[R]** | `bencium-innovative-ux-designer`, `taste-skill` |
| P17.2 | **Identité de marque Tynoc** : nom posé, wordmark, ton, promesse en une phrase | Le site a une personnalité, pas un logo générique | **[R]** | `frontend-design`, `product-marketing`, `canvas-design` |
| P17.3 | **Couleur en OKLCH** plutôt qu'en hex : luminance perceptuellement uniforme, dérivation programmatique des états hover/active/disabled | Une seule teinte de base génère une échelle cohérente ; contrastes stables en clair comme en sombre | **[R]** | `theme-factory`, `design:design-system` |
| P17.4 | **Échelle typographique fluide** (`clamp()`), interlignage lié à la taille, `text-wrap: balance` sur les titres, `pretty` sur les paragraphes | Aucun titre orphelin, aucune veuve typographique | **[R]** | `frontend-design`, `emil-design-eng` |
| P17.5 | **Détail typographique** : `font-optical-sizing`, tracking négatif sur les grandes tailles, chiffres tabulaires sur les prix | Les prix ne « dansent » plus quand la quantité change | **[R]** | `emil-design-eng`, `apple-design` |
| P17.6 | **Matière** : grain subtil, dégradés maillés, ou bordures translucides, un parti pris de texture et un seul | Le site a une surface, pas juste des rectangles blancs | **[D]** | `frontend-design`, `bencium-innovative-ux-designer` |
| P17.7 | **Mode sombre repensé**, pas inversé : hiérarchie d'élévation par la luminosité, ombres remplacées par des bordures lumineuses | Le sombre est aussi soigné que le clair | **[R]** | `theme-factory`, `apple-design` |
| P17.8 | **Système de grille et de rythme vertical** cohérent sur toutes les pages | Les alignements se répondent d'un écran à l'autre | **[R]** | `design:design-system`, `frontend-design` |

### P17.b : Mouvement & interaction

| ID | Tâche | Livrable / critère d'acceptation | Prio | Skills |
| --- | --- | --- | --- | --- |
| P17.9 | **Appliquer la doctrine de motion de P1.8** : chaque animation justifiée par une fonction (orientation, continuité, feedback) ou supprimée | Aucune animation décorative sans rôle | **[R]** | `motion-doctrine`, `review-animations` |
| P17.10 | **Courbes sur mesure** plutôt que `ease-in-out` par défaut ; ressorts pour ce que l'utilisateur manipule, durées pour ce qu'il observe | Le mouvement a un caractère identifiable | **[R]** | `cut-the-curve`, `motion-design`, `animate` |
| P17.11 | **View Transitions API** pour les navigations listing → produit (image partagée qui se déplace) | Amélioration progressive : sans support, navigation classique intacte | **[D]** | `animate`, `seam-craft` |
| P17.12 | **Chorégraphie de chargement** : les skeletons deviennent le contenu, apparition en cascade légère plutôt qu'en bloc | La transition chargement → contenu ne « claque » pas | **[R]** | `emil-design-eng`, `animate` |
| P17.13 | **Micro-interactions** : bascule wishlist (cœur qui se remplit), compteur panier qui incrémente, stepper avec accusé de réception tactile | Chaque action a une réponse perçue immédiate | **[R]** | `emil-design-eng`, `find-animation-opportunities` |
| P17.14 | **Animations pilotées par le scroll** en CSS (`animation-timeline: view()`) pour les entrées de section : sans JS | Zéro coût en JS, dégradation propre | **[D]** | `animate`, `cut-the-curve` |
| P17.15 | **États de survol et de pression physiques** : léger enfoncement, pas juste un changement d'opacité | Les éléments cliquables se sentent cliquables | **[R]** | `apple-design`, `emil-design-eng` |
| P17.16 | **Interruptibilité** : toute animation en cours accepte d'être annulée ou inversée à mi-parcours | Aucune attente forcée imposée à l'utilisateur | **[R]** | `motion-doctrine`, `review-animations` |
| P17.17 | **`prefers-reduced-motion`** : parcours complet vérifié avec l'option activée | Les transitions deviennent des fondus, rien ne casse | **[E]** | `design:accessibility-review`, `review-animations` |

### P17.c : Contenu visuel & détails finaux

| ID | Tâche | Livrable / critère d'acceptation | Prio | Skills |
| --- | --- | --- | --- | --- |
| P17.18 | **Traitement d'image cohérent** : ratios constants, recadrage uniforme, placeholder `blurDataURL`, fond produit homogène | Une grille de produits paraît issue d'un seul shooting | **[R]** | `image`, `frontend-design` |
| P17.19 | **États vides illustrés** plutôt que du texte gris centré | Le panier vide devient un moment de marque, pas un cul-de-sac | **[R]** | `canvas-design`, `design:ux-copy` |
| P17.20 | **404 avec personnalité** : recherche intégrée, produits suggérés, ton juste | Exigence du brief transformée en atout | **[R]** | `design:ux-copy`, `frontend-design` |
| P17.21 | **Jeu d'icônes unique et cohérent** (une seule famille, une seule épaisseur de trait, une seule taille optique) | Aucun mélange de bibliothèques d'icônes | **[E]** | `design:design-system` |
| P17.22 | **Favicon complet + images Open Graph générées dynamiquement** par produit (`ImageResponse`) | Un lien produit partagé affiche le produit | **[D]** | `anthropic-skills:react-nextjs-development`, `image` |
| P17.23 | **Micro-copy final** : chaque bouton, chaque erreur, chaque état vide relu et resserré | Zéro « Oops, something went wrong » | **[R]** | `design:ux-copy`, `copy-editing` |
| P17.24 | **Curseur et sélection personnalisés** (couleur de sélection accordée à la palette) | Détail invisible qui signale le soin | **[D]** | `oversized-cursor`, `emil-design-eng` |
| P17.25 | **Critique de design finale** : confronter le résultat aux 10 directions initiales de P17.1 | La direction choisie tient encore, ou on sait pourquoi elle a dérivé | **[R]** | `design:design-critique`, `taste-skill`, `apple-design` |
| P17.26 | **Vérifier que le polish n'a rien cassé** : Lighthouse, a11y, tests E2E rejoués après P17 | Les scores de P10 et P11 sont maintenus | **[E]** | `verification-before-completion`, `verify-and-stop` |

---

## Ordre d'exécution & dépendances

```text
P0 ──► P1 ──► P2 ──► P3 ──► P4 ──► P5 ──┐
                       │                 ├──► P8 ──► P9 ──► P10 ──► P11 ──► P12 ──┐
             P1 ──► P6 ──► P7 ───────────┘                                         │
                                                                                   ▼
                                                      ┌──────────── P15 (sécurité) ────────────┐
                                                      ├──────────── P16 (RGPD) ────────────────┤──► P13 ──► P14
                                                      └──────────── P17 (esthétique) ──────────┘
```

- **P2 → P3 → P4** est le chemin critique : rien d'utile ne peut être construit avant que le modèle
  de données existe.
- **P6** (composants) peut être menée en parallèle de **P3/P4** dès que P1 est figée : c'est le seul
  endroit où paralléliser a du sens (`dispatching-parallel-agents`).
- **P11** (tests) n'est une phase séparée que pour la vérification globale : les tests unitaires
  s'écrivent **pendant** P3/P4/P5 (`test-driven-development`), pas après.
- **P15, P16 et P17 sont indépendantes entre elles** et peuvent être menées en parallèle après M5.
  Seules trois tâches doivent être anticipées **beaucoup plus tôt**, sous peine de refonte coûteuse :

  | Tâche à anticiper | À traiter dès | Pourquoi |
  | --- | --- | --- |
  | P16.7 : attribut TTL sur les items | **P2.2** (conception des clés) | Ajouter un TTL après coup impose une migration de tous les items existants |
  | P15.1/P15.2 : dérivation serveur de l'identité | **P3/P4** (repositories & services) | Réécrire les signatures de tous les services après coup est un refactor transverse |
  | P17.3 : couleur en OKLCH | **P1.4** (design tokens) | Changer de modèle colorimétrique après P6 oblige à repasser sur tous les composants |

- **P13 (documentation) se fait après P15/P16/P17**, jamais avant, car le README doit décrire le
  produit livré, pas le produit prévu. Les sections sécurité et RGPD s'y ajoutent naturellement.
- Si le temps manque, **couper par priorité, pas par phase** : livrer tous les **[E]** de P15/P16
  vaut mieux que livrer P15 en entier et abandonner P16.

## Jalons de contrôle

| Jalon | Condition de passage |
| --- | --- |
| **M1 : Socle** | ✅ Fin P0+P1 : le projet démarre, la DA est figée, la matrice des états est écrite |
| **M2 : Données** | ✅ Fin P2+P3 : la table est peuplée, les repositories sont testés, le TTL est prévu dans le schéma |
| **M3 : Métier** | ✅ Fin P4+P5 : l'API répond au `curl` avec de vraies données, la logique est couverte |
| **M4 : Produit** | Fin P6+P7+P8 : le site est navigable de bout en bout, panier et wishlist marchent |
| **M5 : Qualité** | Fin P9+P10+P11+P12 : états complets, Lighthouse ≥ 90, CI verte, revues passées |
| **M6 : Durcissement** | Fin P15+P16 : note A sur securityheaders, export et effacement fonctionnels, `PRIVACY.md` et `SECURITY.md` publiés |
| **M7 : Finition** | Fin P17 : direction visuelle assumée, motion cohérente, scores M5 maintenus |
| **M8 : Livraison** | Fin P13+P14 : déployé, documenté, captures prises, soumis |

## Risques identifiés

| Risque | Impact | Mitigation |
| --- | --- | --- |
| Modèle DynamoDB mal conçu, découvert tard | Réécriture des repositories | P2.1/P2.2 : figer les patterns d'accès **avant** les clés |
| Recherche full-text : DynamoDB n'est pas fait pour ça | Recherche lente ou par `Scan` | Recherche sur un jeu borné + tags indexés ; limitation assumée et documentée |
| Logique métier qui fuit dans les composants React | Note d'architecture dégradée | P12.4 : contrôle explicite de la règle de dépendance |
| Secrets AWS committés | Élimination directe | P0.6 + P12.3 + P15.25 (`gitleaks`) ; `.env*.local` ignoré dès le premier commit |
| Coût AWS non maîtrisé | Facturation | `PAY_PER_REQUEST`, bornes de pagination (P15.20), budget avec alerte (P15.22) |
| Sur-ingénierie et dérive de périmètre | Projet inachevé | Périmètre P1.1 verrouillé ; pas de checkout, pas d'admin |
| **TTL ajouté après coup** | Migration de tous les items | Prévoir l'attribut `expiresAt` dès P2.2, même si le TTL n'est activé qu'en P16.7 |
| **CSP cassant le rendu en production** | Page blanche au déploiement | P15.14 : rodage en `Report-Only` avant application |
| **Rate limiting trop agressif** | Utilisateurs légitimes bloqués | Seuils calibrés sur le trafic réel observé, testés avant activation |
| **Polish esthétique qui dégrade la performance** | Perte des scores Lighthouse de P10 | P17.26 : re-vérification obligatoire après P17 |
| **Conformité RGPD déclarative mais non testée** | Documentation qui ment | P16.22 : parcours export/effacement/TTL couverts par des tests |
| **P15/P16/P17 lancées avant que le produit fonctionne** | Durcissement d'une base mouvante | Prérequis M4/M5 explicites ; ces phases ne démarrent pas avant |

---

## Prochaine action

**P6.1 → P6.10, le design system et les composants.** Jalon M3 atteint : l'API répond au curl avec
de vraies données, les Server Actions sont en place, et la session est posée par `proxy.ts` avant
tout rendu.

Trois ruptures de Next 16 rencontrées en P5 et à garder en tête pour la suite :

| Rupture | Conséquence |
| --- | --- |
| `middleware.ts` renommé `proxy.ts` | La fonction exportée s'appelle `proxy`. Elle tourne sur le runtime Node par défaut depuis la v16, donc `node:crypto` y est disponible |
| Un Server Component ne peut pas poser de cookie | Toute écriture de cookie passe par `proxy.ts`, une Server Action ou un Route Handler |
| `RouteContext` est généré, pas fourni | `npm run typecheck` lance `next typegen` d'abord, sans quoi la CI échoue sur un type manquant |

L'ordre de P6 :

1. **P6.1** : trancher primitives maison ou bibliothèque headless, et s'y tenir.
2. **P6.2 et P6.3** : les primitives, puis les notifications.
3. **P6.4 à P6.8** : en-tête, navigation mobile, carte produit, grille, sélecteur de quantité.
4. **P6.9** : les états vides, d'erreur et de chargement, génériques et réutilisés partout.
5. **P6.10** : revue de design avant d'assembler les pages.

Les tokens de P1 sont la seule source de valeurs : aucune couleur, aucune durée et aucun rayon
écrits en dur dans un composant, et aucune classe `dark:`.
