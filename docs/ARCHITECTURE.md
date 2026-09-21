# Architecture & cadrage : Tynoc

> Document de référence de la phase P1. Il fige ce qui ne doit plus être rediscuté :
> le périmètre, le magasin, la direction artistique, les états d'écran, les parcours,
> la doctrine de mouvement et la règle de dépendance entre couches.
> Le besoin est dans [BRIEF.md](./BRIEF.md), le plan d'exécution dans [ROADMAP.md](./ROADMAP.md).

---

## 1. Périmètre (P1.1)

### Dans le périmètre

- Découverte : accueil, catégories, listing, page produit, produits associés.
- Recherche et filtres : texte, catégorie, fourchette de prix, disponibilité, tri.
- Panier : ajout, modification de quantité, retrait, sous-total.
- Wishlist : ajout, retrait, bascule, déplacement vers le panier.
- Données utilisateur : session anonyme persistante, profil minimal, panier et wishlist rattachés.
- Robustesse : chargement, vide, erreur, 404, validation.
- API HTTP documentée + Server Actions.

### Hors périmètre : décidé, pas oublié

| Exclu | Raison |
| --- | --- |
| Paiement / checkout | Hors brief. Un tunnel de paiement crédible demande un PSP, de la conformité et une gestion de commandes : c'est un second projet. Le parcours s'arrête à un panier récapitulé. |
| Back-office d'administration | Hors brief. Le catalogue est alimenté par `scripts/seed.ts`. |
| Authentification complète | Le brief demande la « gestion des données utilisateur », pas des comptes. L'identité est une session anonyme persistante (cookie httpOnly signé). |
| Multi-devise, multi-langue | Prix en centimes d'euro, interface en français. Un seul référentiel, zéro conversion. |
| Avis clients, notes, recommandations personnalisées | Gonflent le modèle de données sans servir un critère d'évaluation. |
| Variantes produit (taille, coloris) | Un produit = une référence = un stock. Évite une explosion du modèle de clés pour un gain nul à l'évaluation. |

**Règle de coupe** : toute demande qui n'est pas dans la colonne de gauche ci-dessus entre dans
« Hors périmètre » par défaut. Le risque n°1 de ce projet est l'inachèvement, pas le manque
de fonctionnalités.

---

## 2. Le magasin (P1.2)

**Tynoc vend du matériel d'écoute** : casques, enceintes, convertisseurs numérique-analogique,
amplificateurs, microphones, câblage et accessoires.

- **Public** : quelqu'un qui compare trois fiches techniques avant d'acheter un casque à 400 €.
  Il sait ce qu'est une impédance. Il se méfie du marketing.
- **Promesse** : « Choisis pour leurs mesures autant que pour leur écoute. »
- **Ton** : factuel, précis, sans superlatif. On donne un chiffre plutôt qu'un adjectif.
  « Réponse tenue jusqu'à 8 Hz » plutôt que « des basses profondes ».
- **Conséquence sur les données** : les descriptions produit portent de vraies caractéristiques,
  les tags sont exploitables comme filtres (`ouvert`, `fermé`, `sans-fil`, `studio`, `nomade`,
  `haute-impédance`), et les prix s'étalent de 4 900 à 189 900 centimes, une amplitude qui rend
  le filtre de prix réellement utile.

Ce choix n'est pas cosmétique : il donne un jeu de données crédible au seed (P2.8), des filtres
qui ont un sens, et une direction artistique qui découle du sujet plutôt que d'un goût général.

---

## 3. Direction artistique (P1.3)

### Le parti pris : l'instrument, pas la boutique

Le vocabulaire visuel de l'audio haut de gamme est celui de l'appareil de mesure (courbe de
réponse, VU-mètre, aluminium usiné, fiche technique), pas celui du commerce chaleureux.
La page doit ressembler à un instrument bien réglé : dense en information, calme, précise.

### Décisions et justifications

| Axe | Décision | Ce qui a été écarté, et pourquoi |
| --- | --- | --- |
| **Palette** | Graphite neutre froid : teinte 250, chroma 0.004 à 0.010. Les produits sont noirs, argent et bois ; le fond ne doit pas leur disputer la couleur. | Crème + terracotta et noir + vert acide : deux rendus par défaut, reconnaissables et sans lien avec le sujet. |
| **Accent** | Trois couleurs sémantiques seulement. `signal` (ambre, teinte 78-80) = actif/attention ; `peak` (rouge) = limite atteinte ; `jade` = disponible. Chacune **encode une information**, aucune ne décore. | Un accent unique « de marque » posé au hasard sur des boutons, des liens et des icônes sans distinction. |
| **Action primaire** | Encre pleine, noir sur clair et blanc sur sombre. Jamais l'ambre. | Un bouton ambre perdrait sa valeur de signal en devenant omniprésent, et son contraste serait limite sur fond clair. |
| **Typographie** | **Archivo variable, une seule famille.** Le registre display vient de l'axe de chasse (`wdth`) et d'un tracking négatif, pas d'une seconde police. | Un duo serif display + sans body : correct, mais c'est le réflexe par défaut. Ici, la variation de chasse rappelle les sérigraphies de façade d'ampli. |
| **Chiffres** | `tabular-nums` global. | Des chiffres proportionnels font sauter la largeur d'un prix quand la quantité change. |
| **Rayons** | 2 / 3 / 5 / 8 / 12 / 16 px, soit **un cran par niveau de hiérarchie** (badge, bouton, carte, feuille modale). | Un rayon unique appliqué partout : c'est la signature du kit de cartes générique. |
| **Élévation** | En clair : ombres douces. En sombre : **luminosité de surface croissante**, aucune ombre. | Des ombres noires sur fond sombre ne produisent aucune profondeur perceptible. |
| **Densité** | Information dense mais aérée par un rythme vertical régulier. Les caractéristiques techniques sont affichées, pas cachées derrière un accordéon. | Le grand vide « premium » qui oblige à scroller pour trouver l'impédance. |

### Mécanique des tokens (P1.4, P1.5)

Tout vit dans [`src/app/globals.css`](../src/app/globals.css). Trois règles :

1. **Couleur en OKLCH.** La luminance y est perceptuellement uniforme : `L 0.55` pèse le même
   poids visuel quelle que soit la teinte, donc les échelles se dérivent en faisant varier `L`
   sans recalibrer à l'œil. C'est aussi ce qui rend les contrastes stables d'un thème à l'autre.
2. **Thème via `light-dark()`.** Chaque token porte ses deux valeurs sur une seule ligne. L'écart
   clair/sombre est lisible d'un coup d'œil, et il n'y a pas de bloc `@media` dupliqué à maintenir.
   La bascule manuelle se fait par `data-theme="light|dark"` sur `<html>`, qui force `color-scheme`.
3. **Aucun composant n'écrit jamais `dark:`.** Les tokens basculent seuls. Une classe `dark:bg-…`
   dans un composant est un bug, pas un style. C'est vérifiable par `grep`.

| Famille | Tokens | Usage |
| --- | --- | --- |
| Surfaces | `surface-0` → `surface-3`, `surface-inverse` | Page, carte, champ, survol |
| Encre | `ink-strong`, `ink`, `ink-muted`, `ink-faint`, `ink-inverse` | `ink-faint` ne porte jamais d'information seule |
| Traits | `line-subtle`, `line`, `line-strong` | Séparation, bordure, contour de champ |
| Action | `action`, `action-hover`, `on-action` | Bouton primaire uniquement |
| Signalétique | `signal`, `peak`, `jade` (+ `-ink` pour le texte, `-soft` pour les fonds) | Voir tableau ci-dessus |
| Typo | `text-2xs` → `text-5xl` (fluides en `clamp()`), `tracking-*` | Valeur basse à 360 px, haute à 1440 px |
| Rayons | `radius-xs` → `radius-2xl` | Un cran par niveau |
| Mouvement | `ease-snap`, `ease-flow`, `ease-settle`, `duration-instant` → `duration-slow` | Voir § 7 |
| Empilement | `--z-sticky`, `--z-header`, `--z-drawer`, `--z-dialog`, `--z-toast` | Aucun `z-index` littéral ailleurs |

La page `/` sert provisoirement de planche de contrôle de ces tokens, dans les deux thèmes.
Elle est remplacée par l'accueil réel en P7.2.

---

## 4. Architecture logique

### Flux

```text
Navigateur
    │
    ├─ Server Component ──────────┐
    │                             │
    └─ Server Action / Route API ─┤
                                  ▼
                            src/server/services/        ← LOGIQUE MÉTIER
                                  │                       pure, testable, sans framework
                                  ▼
                            src/server/repositories/    ← ACCÈS DYNAMODB
                                  │                       et rien d'autre
                                  ▼
                            src/lib/dynamodb.ts
                                  │
                                  ▼
                            AWS DynamoDB (table unique)
```

### Règle de dépendance : non négociable

```text
app/ → server/actions/ + app/api/ → server/services/ → server/repositories/ → lib/dynamodb
```

| Couche | Connaît | Ne connaît jamais |
| --- | --- | --- |
| Composants serveur (`app/`, `components/`) | Types du domaine, services en **lecture**, Server Actions | `PK`/`SK`, le SDK AWS, un repository |
| Composants client (`"use client"`) | Types du domaine, Server Actions | Tout le reste de `server/` |
| `server/actions/`, `app/api/` | HTTP, `FormData`, cookies, services | DynamoDB, `PK`/`SK` |
| `server/services/` | Types du domaine, repositories, `AppError` | React, HTTP, `Request`, `PK`/`SK` |
| `server/repositories/` | Le SDK, les clés, les mappers | Les règles métier |

Le sens des flèches ne s'inverse jamais. C'est le critère d'architecture le plus visible à
l'évaluation ; toute violation est traitée comme un bug.

**Lecture de la flèche `app/ →`.** Un Server Component lit ses données en appelant un service,
comme le montre le schéma de flux ci-dessus. Il ne passe **pas** par une route API : appeler sa
propre API depuis le serveur ajoute un aller-retour HTTP sans rien isoler de plus, et la
documentation de Next le déconseille explicitement. Les Server Actions et les routes API sont
les points d'entrée des **écritures** et des clients externes. Dans les deux cas, la frontière qui
compte tient : rien au-dessus des services ne voit un repository ni une clé.

**Contrôle automatique (P12.4).** La règle n'est pas vérifiée à la main :

| Garde | Où | Ce qu'elle bloque |
| --- | --- | --- |
| `no-restricted-imports` | `eslint.config.mjs`, un bloc par couche | Interface vers repositories, SDK ou clés ; service vers Next, React, repositories, session ; repository vers services ou actions ; socle partagé vers toute couche |
| `import "server-only"` | `services/index.ts` | Un composant client qui importerait un service : échec au build |

Les deux tournent dans `npm run verify` et dans la CI. Une violation est une erreur, pas une
remarque de revue.

### Deux conséquences anticipées

- **L'identité utilisateur est toujours dérivée du cookie serveur** (P15.1). Aucune signature de
  service n'accepte un `userId` venu du client. Décidé maintenant parce que le rattraper plus tard
  impose de réécrire toutes les signatures de services.
- **Chaque item porte un attribut `expiresAt`** dès la conception des clés (P16.7), même si le TTL
  DynamoDB n'est activé que plus tard. L'ajouter après coup imposerait une migration de tous
  les items existants.

---

## 5. Inventaire des écrans et de leurs états (P1.6)

Cette matrice est la checklist de la phase P9. Une case vide est un état non traité, donc un bug.

| # | Écran | Route | Chargement | Vide | Erreur | Cas limite |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Accueil | `/` | Squelettes de grille + bandeau | Catalogue vide → message d'amorçage | `error.tsx` segment, bouton Réessayer | Moins de 4 produits : la grille ne se disloque pas |
| 2 | Catégories | `/categories` | Squelettes de vignettes | Aucune catégorie | Idem | Catégorie sans produit : affichée, comptée à 0 |
| 3 | Catégorie | `/categories/[slug]` | Bannière + squelettes | Catégorie sans produit → lien vers le listing complet | Idem | Slug inconnu → `notFound()` |
| 4 | Listing | `/products` | Squelettes de cartes, filtres déjà interactifs | Filtres trop restrictifs → proposition de relâcher un filtre | Idem | Page au-delà du dernier curseur → retour page 1 |
| 5 | Recherche | `/products?q=` | Squelettes + requête conservée dans le champ | Aucun résultat → suggestions et catégories | Idem | Requête de 1 caractère, requête très longue : bornées |
| 6 | Produit | `/products/[slug]` | Squelette de galerie + bloc d'achat | sans objet | Idem | Slug inconnu → `notFound()` ; rupture de stock → achat désactivé, wishlist active |
| 7 | Panier | `/cart` | Squelettes de lignes | Panier vide → appel à l'action vers le listing | Idem | Ligne orpheline (produit supprimé) ; quantité > stock ; stock passé à 0 |
| 8 | Wishlist | `/wishlist` | Squelettes de cartes | Wishlist vide → appel à l'action | Idem | Produit supprimé du catalogue ; produit en rupture non déplaçable au panier |
| 9 | 404 | `not-found.tsx` | sans objet | C'est l'état | sans objet | Recherche intégrée + catégories, jamais un cul-de-sac |
| 10 | Erreur globale | `error.tsx` | sans objet | sans objet | C'est l'état | Panne DynamoDB : message clair, aucune trace technique exposée |

**Règles transverses** : aucun spinner plein écran ; les squelettes reprennent la géométrie exacte
du contenu final (zéro saut de layout) ; chaque état vide propose une sortie ; aucun message
d'erreur générique du type « Une erreur est survenue ».

---

## 6. Parcours critiques (P1.7)

Ce sont les trois parcours couverts en E2E (P11.7) et vérifiés en conditions réelles (P14.4).

### A : Découverte → produit → panier

```text
Accueil                Catégorie / Listing        Page produit              Panier
┌──────────────┐       ┌──────────────┐           ┌──────────────┐          ┌──────────────┐
│ Hero         │       │ Grille       │           │ Galerie      │          │ Lignes       │
│ Catégories   │──────▶│ Filtres URL  │──────────▶│ Prix / stock │─────────▶│ Sous-total   │
│ Nouveautés   │       │ Tri          │           │ Ajout panier │   ▲      │ Récapitulatif│
└──────────────┘       └──────────────┘           │ Associés ────┼───┘      └──────────────┘
                                                  └──────────────┘
                                                        │
                        Rupture de stock ───────────────┘
                        → achat désactivé, wishlist proposée à la place
```

Point de vérité : l'ajout au panier passe par une Server Action, le total est recalculé côté
serveur, et le compteur d'en-tête reflète l'état réel après `revalidatePath`.

### B : Recherche → filtre → résultat

```text
Champ d'en-tête ──▶ /products?q=…  ──▶ Filtres (catégorie, prix, dispo) ──▶ Tri
                          │                        │                          │
                          └────────────────────────┴──────────────────────────┘
                                          tout est porté par l'URL
                                                  │
                            ┌─────────────────────┴─────────────────────┐
                            ▼                                           ▼
                    Résultats paginés                            Aucun résultat
                    (curseur opaque)                    → suggestions + relâcher un filtre
```

Point de vérité : l'état de recherche vit dans `searchParams`, donc une URL de résultats est
partageable et rechargeable à l'identique. Aucun état de filtre en mémoire client.

### C : Wishlist → panier

```text
Carte produit / Page produit              Wishlist                     Panier
┌──────────────────────┐                  ┌──────────────┐             ┌──────────────┐
│ Bascule favori ──────┼─────────────────▶│ Grille       │             │ Ligne créée  │
│ (état lu en base)    │◀─────────────────┤ Retirer      │             │ ou quantité  │
└──────────────────────┘                  │ Déplacer ────┼────────────▶│ incrémentée  │
                                          └──────────────┘             └──────────────┘
                                                  │
                        « Déplacer » = ajout panier + retrait wishlist,
                        atomique côté service : jamais l'un sans l'autre.
```

Point de vérité : l'état du bouton favori est lu en base, pas déduit localement, donc il est
cohérent entre la carte, la page produit et la page wishlist.

---

## 7. Doctrine de mouvement (P1.8)

**Une animation doit répondre à une des trois questions suivantes, sinon elle est supprimée :**
où suis-je (orientation), d'où vient cet élément (continuité), mon geste a-t-il été reçu (retour) ?

| Rôle | Durée | Courbe | Exemples |
| --- | --- | --- | --- |
| Retour d'état | `duration-instant` (90 ms) | `ease-snap` | Survol, pression, focus |
| Bascule | `duration-fast` (160 ms) | `ease-snap` | Cœur de la wishlist, compteur du panier, stepper |
| Entrée / sortie d'élément | `duration-base` (240 ms) | `ease-settle` | Ligne de panier retirée, toast |
| Surface entière | `duration-slow` (400 ms) | `ease-flow` | Tiroir mobile, dialogue |

**Interdits** :

- Toute animation déclenchée par le défilement pour de la simple décoration.
- Les entrées en fondu-montée en cascade sur chaque section : c'est le tell d'une page générée.
- Toute animation qui retarde une interaction. Le contenu est utilisable pendant qu'il arrive.
- Les durées supérieures à 400 ms.

**Obligations** :

- Toute animation en cours accepte d'être interrompue ou inversée à mi-parcours.
- `prefers-reduced-motion: reduce` est traité globalement dans `globals.css` : les transitions
  deviennent quasi instantanées, rien ne casse et rien ne disparaît.
- Une animation ne transporte jamais une information qui n'existe pas ailleurs.

---

## 8. Micro-copy (P1.9)

Les mots sont du contenu de design, pas de la décoration. Principes :

- **Le verbe de l'action reste le même de bout en bout.** Le bouton dit « Ajouter au panier », la
  confirmation dit « Ajouté au panier ». Jamais « Soumettre », jamais « Valider ».
- **Une erreur dit ce qui s'est passé et quoi faire.** Pas d'excuse, pas de vague.
  « Le stock disponible est de 3 exemplaires. » plutôt que « Une erreur est survenue. »
- **Un état vide est une invitation, pas un constat.** « Votre panier est vide » suivi d'une sortie
  concrète, pas d'un cul-de-sac gris centré.
- **Pas de superlatif.** Le ton du magasin est factuel (§ 2) : un chiffre plutôt qu'un adjectif.
- **Casse de phrase partout**, jamais de libellé en capitales espacées.

Extraits figés :

| Situation | Texte |
| --- | --- |
| Ajout au panier réussi | « Ajouté au panier » + action « Voir le panier » |
| Retrait d'une ligne | « Ligne retirée » + action « Annuler » |
| Stock insuffisant | « Il reste 3 exemplaires. La quantité a été ajustée. » |
| Produit indisponible | « Indisponible pour le moment » + « Prévenez-moi » écarté du périmètre → « Ajouter aux favoris » |
| Panier vide | « Votre panier est vide. » + « Parcourir le catalogue » |
| Wishlist vide | « Aucun favori pour l'instant. » + « Parcourir le catalogue » |
| Recherche sans résultat | « Aucun résultat pour “{requête}”. » + relâcher un filtre / catégories suggérées |
| 404 | « Cette page n'existe pas. » + champ de recherche + catégories |
| Panne serveur | « Le catalogue est momentanément injoignable. » + « Réessayer » |

---

## 9. Décisions verrouillées

| Sujet | Décision | Conséquence |
| --- | --- | --- |
| Périmètre livrable | Core P0 → P14 **+ uniquement les tâches [E]** de P15/P16/P17 | M8 (livraison) prime sur le durcissement. Les tâches [D] sont abandonnées, les [R] réévaluées après M5. |
| Base de données en développement | **DynamoDB Local** (Docker) par défaut ; AWS réel en P14 seulement | `DYNAMODB_ENDPOINT` est le chemin nominal en dev. Zéro coût, tests d'intégration possibles hors ligne. La création de l'utilisateur IAM glisse de P2.5 à P14.1. |
| Magasin | Audio et matériel d'écoute | Voir § 2. Détermine le seed, les filtres et la DA. |
| Recherche | Chargement borné du catalogue + filtrage applicatif, jamais un `Scan` paginé | Le catalogue compte environ 45 produits. La limite est assumée et documentée dans le README plutôt que masquée derrière une solution fragile. |
| Thème | `light-dark()` + `data-theme`, aucun `dark:` dans les composants | Voir § 3. |
