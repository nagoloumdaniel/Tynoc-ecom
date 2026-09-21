# Conformité au brief (P12.6)

Chaque puce de [BRIEF.md](BRIEF.md) est pointée vers son implémentation et vers ce qui la prouve.
Un test cité est un test qui passe aujourd'hui ; une puce sans preuve automatisée le dit.

Légende : ✅ fait et prouvé, 🟡 fait, preuve partielle, ⬜ planifié (phase indiquée).

## Vitrine

| Puce du brief | Implémentation | Preuve |
| --- | --- | --- |
| Page d'accueil moderne et responsive | `src/app/page.tsx` | ✅ `tests/e2e/responsive.spec.ts` : 4 largeurs sans débordement |
| Catégories de produits | `src/app/categories/page.tsx`, `src/app/categories/[slug]/page.tsx` | ✅ `tests/e2e/purchase-journey.spec.ts` (entrée par « Casques ») |
| Liste des produits | `src/app/products/page.tsx`, pagination par curseur (`src/lib/cursor.ts`) | ✅ `tests/e2e/search-and-filter.spec.ts` (pagination conservant les filtres) |
| Pages de détail produit | `src/app/products/[slug]/page.tsx` | ✅ parcours d'achat E2E |
| Recherche et filtrage | `src/components/product/filter-bar.tsx`, `searchCatalogue` dans `src/server/catalogue.ts` | ✅ 9 tests E2E : état dans l'URL, rechargement, retour arrière, tri réel |
| Images et informations produit | `next/image` en AVIF puis WebP, caractéristiques techniques par produit | ✅ `tests/e2e/performance.spec.ts` (formats modernes servis) |
| Produits associés | `getRelatedProducts`, section « Dans la même famille » de la fiche | 🟡 rendu vérifié à la main, pas d'assertion E2E dédiée |

## Gestion des utilisateurs et des données

| Puce du brief | Implémentation | Preuve |
| --- | --- | --- |
| Gestion des données utilisateur | `src/app/account/page.tsx` : profil éditable, vue des données détenues, effacement | ✅ `tests/unit/user.service.test.ts`, intégration `user.repository` |
| Produits, catégories | Repositories `product` et `category`, GSI1 et GSI2 | ✅ 11 patterns d'accès rejoués contre DynamoDB Local |
| Panier, liste de souhaits | Repositories `cart` et `wishlist`, sous la partition de l'utilisateur | ✅ intégration, puis parcours E2E |

L'identité vient d'un cookie signé posé par `src/proxy.ts`, jamais d'un paramètre client. Il n'y a
pas de comptes : le brief demande la gestion des données, pas une authentification.

## Panier et liste de souhaits

| Puce du brief | Implémentation | Preuve |
| --- | --- | --- |
| Ajouter au panier | `cartService.addItem`, `addToCartAction`, `POST /api/cart` | ✅ unitaires + E2E |
| Modifier la quantité | `cartService.setQuantity`, sélecteur à écriture groupée | ✅ E2E : la quantité survit au rechargement |
| Retirer des articles | `cartService.removeItem`, retrait annulable | ✅ E2E « le retrait est annulable » |
| Calculer le sous-total | `buildSummary` dans `cart.service.ts`, entiers en centimes, prix courant relu à chaque calcul | ✅ unitaires (sommes, lignes orphelines, arrondis impossibles) |
| Ajouter / retirer de la wishlist | `wishlistService.toggle`, bouton cœur | ✅ E2E : l'état tient avant **et** après rechargement |
| Empêcher les doublons | Clé `CART#<productId>` et `WISH#<productId>` : un produit, un item. Écriture conditionnelle `attribute_not_exists(SK)` | ✅ E2E « le même produit ajouté deux fois incrémente au lieu de se dupliquer » |

## Expérience applicative

| Puce du brief | Implémentation | Preuve |
| --- | --- | --- |
| Responsive mobile, tablette, desktop | Grilles fluides, tiroir mobile en `<dialog>` natif, cibles de 44 px | ✅ `responsive.spec.ts` : 360, 768, 1024, 1440 px × 6 pages |
| États de chargement | Un `loading.tsx` par route à données, squelettes au gabarit du contenu | ✅ CLS mesuré sous 0,1 |
| États vides | `EmptyState`, avec une sortie sur chaque écran vide | ✅ E2E panier vide, favoris vides, recherche sans résultat |
| Gestion des erreurs | `error.tsx`, `global-error.tsx`, `AppError` avec message public ou générique | ✅ `states.test.tsx`, `errors.test.ts` ; dégradation base arrêtée vérifiée à la main en P9 |
| Validation des formulaires | Schémas Zod partagés client et serveur, erreurs par champ | 🟡 refus serveur testé (`user.service.test.ts`, `api.routes.test.ts`) ; le formulaire de profil n'a pas de test de composant |
| 404 / page non trouvée | `src/app/not-found.tsx`, `notFound()` sur slug inconnu | ✅ `errors.test.ts`, `api.routes.test.ts` (404 structuré) |

## Stack imposée

| Couche | Imposé | Utilisé |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript | ✅ Next.js 16.3, React 19.2, TypeScript 5 en strict renforcé |
| Backend | Route Handlers, Server Actions | ✅ les deux : Server Actions pour l'interface, routes API documentées dans `docs/API.md` |
| Base de données | AWS DynamoDB | ✅ single-table, DynamoDB Local en développement |
| Styling | Tailwind CSS | ✅ Tailwind v4 |
| Gestion de version | Git et GitHub | ✅ Conventional Commits, une branche par phase |

## Conception de la base de données

| Exigence | Où |
| --- | --- |
| Utilisateurs, produits, catégories, panier, liste de souhaits | ✅ [DATA-MODEL.md](DATA-MODEL.md) : les 5 entités, leurs clés et attributs |
| Comment l'application lit, crée, met à jour et supprime | ✅ [DATA-MODEL.md](DATA-MODEL.md) : CRUD par entité, 11 patterns d'accès |

## Architecture et exigences de développement

| Exigence | Où | Preuve |
| --- | --- | --- |
| Séparation UI, métier, API, base, types, utilitaires | `components/`, `server/services/`, `server/actions/` + `app/api/`, `server/repositories/`, `schemas/` + `types/`, `lib/` | ✅ règle ESLint par couche, qui échoue sur une violation |
| Composants réutilisables | `src/components/ui/`, variantes plutôt que booléens | ✅ tests de composants |
| TypeScript correct | Types dérivés de Zod, `noUncheckedIndexedAccess` | ✅ `npm run typecheck` en CI |
| Logique API structurée | Enveloppe unique, `handleRoute`, statut porté par l'erreur | ✅ intégration des routes |
| Erreurs base et application | Aucune erreur AWS brute ne remonte, traduction en `AppError` | ✅ unitaires `dynamo-errors`, messages génériques pour `DATABASE` |
| Valider les entrées importantes | Zod à chaque frontière, `strictObject`, taille de corps bornée, JSON exigé | ✅ `api.test.ts`, `api.routes.test.ts`, `security.spec.ts` (400, 403, 415) |
| Variables d'environnement | `src/lib/env.ts`, validées au démarrage | ✅ aucune lecture brute de `process.env` ailleurs |
| Aucun identifiant sensible en dur | `.env*` ignorés, `.env.example` vide de secrets | ✅ historique Git complet parcouru en P12.3 : aucun secret |
| Commits significatifs | Conventional Commits, un commit par unité de travail | ⬜ nettoyage final en P12.5 |
| Documentation claire | `docs/` : architecture, modèle de données, API, conformité | 🟡 README complet en P13 |

## Rendu

| Livrable | État |
| --- | --- |
| Lien du dépôt GitHub | ✅ <https://github.com/nagoloumdaniel/Tynoc-ecom> |
| Lien du projet en ligne | ⬜ P14, déploiement |
| README : présentation, fonctionnalités, stack, structure, architecture, configuration DynamoDB, variables d'environnement, installation | 🟡 stack, architecture, variables et installation présents ; **fonctionnalités, structure du projet et configuration DynamoDB manquent**. Complété en P13 |
| Captures d'écran | ⬜ `docs/screenshots/` est vide. P13 |

## Écarts ouverts

Trois, tous planifiés, aucun dans le code :

1. **README incomplet** : trois sections exigées manquent. P13.
2. **Aucune capture d'écran.** P13.
3. **Pas de déploiement.** P14, qui demande un compte AWS.

Et un point hors roadmap : la CI n'a jamais tourné sur l'ancien compte GitHub, dont les Actions
étaient désactivées. Elle sera vérifiée au premier push sur le nouveau.
