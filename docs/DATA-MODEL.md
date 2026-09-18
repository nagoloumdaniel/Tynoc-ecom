# Modèle de données

> Conception de la table DynamoDB et documentation des opérations de lecture,
> création, mise à jour et suppression, exigées par le brief.
> Le raisonnement d'architecture est dans [ARCHITECTURE.md](./ARCHITECTURE.md).

## 1. Méthode

Un modèle DynamoDB se conçoit **à partir des requêtes, jamais des entités**. Une table
relationnelle se normalise puis s'interroge ; une table DynamoDB se dessine à partir de la liste
exhaustive des accès, et cette liste est figée avant la première clé.

Les onze patterns d'accès de l'application sont donc écrits en premier, et la structure en découle.

## 2. Patterns d'accès

| # | Besoin applicatif | Opération | Clés |
| --- | --- | --- | --- |
| A1 | Lire un produit par identifiant | `GetItem` | `PK = PRODUCT#<id>`, `SK = META` |
| A2 | Résoudre un slug d'URL vers son produit | `Query` GSI2 | `GSI2PK = SLUG#<slug>` |
| A3 | Lister une catégorie, triée par prix | `Query` GSI1 | `GSI1PK = PRODUCTS#ALL`, `begins_with(GSI1SK, CATEGORY#<slug>#)` |
| A4 | Lister tout le catalogue | `Query` GSI1 | `GSI1PK = PRODUCTS#ALL` |
| A5 | Lister les catégories | `Query` | `PK = CATEGORY#ALL`, `begins_with(SK, CATEGORY#)` |
| A6 | Lire le panier d'un utilisateur | `Query` | `PK = USER#<id>`, `begins_with(SK, CART#)` |
| A7 | Lire la liste de souhaits | `Query` | `PK = USER#<id>`, `begins_with(SK, WISH#)` |
| A8 | Ajouter ou incrémenter une ligne de panier | `UpdateItem` | `SK = CART#<productId>` |
| A9 | Ajouter à la wishlist sans doublon | `PutItem` conditionnel | `attribute_not_exists(PK)` |
| A10 | Produits associés | `Query` GSI1 puis filtrage | A3 moins le produit courant |
| A11 | Lire ou créer le profil | `GetItem` / `PutItem` | `PK = USER#<id>`, `SK = PROFILE` |

**Aucun `Scan`**, à aucun endroit, y compris dans les scripts d'administration. Ce critère est
vérifié par une suite automatisée : [`tests/integration/data-model.test.ts`](../tests/integration/data-model.test.ts)
exécute les onze patterns contre une vraie base et échoue si l'un d'eux cesse de se résoudre.

## 3. Structure de la table

Une table unique, `tynoc-ecom-<environnement>`, en facturation à la demande (`PAY_PER_REQUEST`).

| Élément | Clé de partition | Clé de tri |
| --- | --- | --- |
| Table | `PK` | `SK` |
| GSI1 (listing) | `GSI1PK` | `GSI1SK` |
| GSI2 (slug) | `GSI2PK` | `GSI2SK` |

Les deux index projettent tous les attributs (`ALL`). Une projection partielle obligerait à relire
chaque produit après un listing, ce qui est exactement le problème N+1 que l'index doit éviter.

Seuls les attributs de clé sont déclarés à la création de la table. Tous les autres restent libres :
c'est ce qui permet à cinq entités de cohabiter dans une même table.

### Les cinq entités

| Entité | `PK` | `SK` | `GSI1PK` | `GSI1SK` | `GSI2PK` | `GSI2SK` |
| --- | --- | --- | --- | --- | --- | --- |
| Produit | `PRODUCT#<id>` | `META` | `PRODUCTS#ALL` | `CATEGORY#<cat>#PRICE#<prix>#<id>` | `SLUG#<slug>` | `PRODUCT` |
| Catégorie | `CATEGORY#ALL` | `CATEGORY#<slug>` | sans objet | sans objet | sans objet | sans objet |
| Utilisateur | `USER#<id>` | `PROFILE` | sans objet | sans objet | sans objet | sans objet |
| Ligne de panier | `USER#<id>` | `CART#<productId>` | sans objet | sans objet | sans objet | sans objet |
| Entrée de wishlist | `USER#<id>` | `WISH#<productId>` | sans objet | sans objet | sans objet | sans objet |

Aucune de ces chaînes n'est écrite à la main dans le code applicatif : elles sortent toutes de
[`src/lib/keys.ts`](../src/lib/keys.ts), qui est testé unitairement sans base de données.

## 4. Les quatre décisions qui structurent le modèle

### 4.1 Une seule partition pour tout le catalogue

`GSI1PK` vaut `PRODUCTS#ALL` pour **tous** les produits, et la clé de tri compose catégorie, prix
puis identifiant :

```text
CATEGORY#casques#PRICE#0000054900#prd_a1b2c3d4e5f6
```

Cette composition sert deux patterns avec un seul index. Une `Query` sans condition de tri ramène
le catalogue complet (A4) ; la même `Query` avec `begins_with(CATEGORY#casques#)` ramène la
catégorie **déjà triée par prix** (A3), et `ScanIndexForward: false` suffit à inverser le tri.

Trois détails qui ne sont pas des détails :

- Le prix est **complété à dix chiffres**. DynamoDB trie les clés de tri comme des chaînes : sans
  largeur fixe, `"900"` se placerait après `"1000"`.
- L'identifiant en queue **départage deux produits au même prix**. Sans lui, le second écraserait
  le premier dans l'index.
- Le préfixe de `begins_with` **se termine par le séparateur**. Sans ce `#` final, `casques`
  ramènerait aussi `casques-sans-fil`.

*Limite assumée* : une partition unique est une partition chaude. Sans conséquence pour une
vitrine de moins de cent produits. Au-delà de quelques milliers, il faudrait la fragmenter en
`PRODUCTS#ALL#0` à `PRODUCTS#ALL#9` et lire les fragments en parallèle.

### 4.2 L'anti-doublon vient de la clé, pas du code

Le brief demande d'empêcher les doublons. Le modèle rend le doublon **impossible** plutôt que de
le détecter :

- `SK = CART#<productId>` est unique dans la partition de l'utilisateur. Deux ajouts du même
  produit visent le même item ; le second ne peut qu'incrémenter la quantité, via
  `UpdateExpression: ADD quantity :n`.
- `SK = WISH#<productId>` suit la même logique, avec une conséquence différente : il n'y a rien à
  incrémenter, donc l'ajout est idempotent. Le `PutItem` porte
  `ConditionExpression: attribute_not_exists(PK)`, et l'échec conditionnel se traduit en erreur
  applicative de doublon plutôt qu'en erreur AWS brute.

Aucune lecture préalable, donc aucune fenêtre de concurrence entre le « est-ce que ça existe ? »
et le « alors j'écris ».

### 4.3 Profil, panier et wishlist partagent une partition

Les trois vivent sous `PK = USER#<id>` et se distinguent par le préfixe de leur clé de tri. Une
seule `Query` ramène l'ensemble des données d'un utilisateur, ce qui sert le panier, le compteur
d'en-tête et l'export RGPD (P16.12) sans jointure ni aller-retour multiple.

C'est aussi ce qui rend le droit à l'effacement (P16.13) réellement praticable : supprimer un
utilisateur revient à supprimer une partition, pas à parcourir cinq tables.

### 4.4 Le prix n'est jamais recopié dans le panier

Une ligne de panier ne stocke que `productId`, `quantity` et ses horodatages. Le prix est relu
depuis le produit au moment du calcul.

Un prix recopié devient faux à la première mise à jour du catalogue. Comme le brief demande un
sous-total juste, la seule source de vérité du prix est le produit.

## 5. Attributs communs

| Attribut | Présent sur | Rôle |
| --- | --- | --- |
| `entityType` | Tous les items | Lisibilité en console et filtrage défensif après une `Query` qui ramène plusieurs types |
| `createdAt`, `updatedAt` | Produit, catégorie, ligne de panier | Horodatages ISO 8601 UTC |
| `expiresAt` | Utilisateur, panier, wishlist | Époque Unix en **secondes**, purge automatique par le TTL DynamoDB |

### Sur `expiresAt`

L'attribut est écrit dès maintenant, alors que le TTL n'est fonctionnellement exploité qu'en P16.7.
C'est délibéré : l'ajouter après coup imposerait une migration de tous les items existants.

Il est rafraîchi à chaque interaction, donc un panier utilisé n'expire jamais sous son
propriétaire. La durée est de 90 jours d'inactivité
([`src/lib/limits.ts`](../src/lib/limits.ts)). Le catalogue n'en porte pas : un produit n'expire
pas tout seul.

## 6. Opérations CRUD par entité

Exigence explicite du brief : documenter comment l'application lit, crée, met à jour et supprime
ses données. Chaque opération est encapsulée dans un repository ; aucune commande du SDK n'existe
ailleurs dans le code.

### Produit

| Opération | Commande | Détail |
| --- | --- | --- |
| Créer | `BatchWriteItem` | Par lots de 25, depuis `scripts/seed.ts` uniquement. L'application ne crée pas de produit. Les `UnprocessedItems` sont rejoués avec temporisation croissante |
| Lire | `GetItem` (A1), `Query` GSI2 (A2), `Query` GSI1 (A3, A4, A10) | Retourne des entités du domaine, jamais des items bruts |
| Mettre à jour | `PutItem` | Réécriture complète au seed. Un changement de prix ou de catégorie doit régénérer `GSI1SK`, qui les contient tous deux |
| Supprimer | `DeleteItem` | Hors périmètre applicatif. Une suppression laisse des lignes de panier orphelines, signalées à l'utilisateur et non supprimées en silence |

### Catégorie

| Opération | Commande | Détail |
| --- | --- | --- |
| Créer | `BatchWriteItem` | Seed |
| Lire | `Query` (A5) pour la liste, `GetItem` pour une catégorie | L'ordre d'affichage vient de l'attribut `position`, trié en mémoire : huit éléments ne justifient pas un index |
| Mettre à jour | `PutItem` | Seed |
| Supprimer | `DeleteItem` | Non exposé |

### Utilisateur

| Opération | Commande | Détail |
| --- | --- | --- |
| Créer | `PutItem` conditionnel | À la première visite, identifiant tiré par `crypto.randomUUID()` côté serveur (P15.5) |
| Lire | `GetItem` (A11) | L'identifiant vient toujours du cookie serveur, jamais d'un paramètre client (P15.1) |
| Mettre à jour | `UpdateItem` | `lastSeenAt`, `expiresAt` et le seul champ modifiable, `displayName` |
| Supprimer | `Query` puis `BatchWriteItem` de suppressions | Droit à l'effacement : toute la partition `USER#<id>`, profil, panier et wishlist compris |

### Ligne de panier

| Opération | Commande | Détail |
| --- | --- | --- |
| Créer ou incrémenter | `UpdateItem` avec `ADD quantity` | Une seule opération pour les deux cas, donc pas de condition de concurrence |
| Lire | `Query` (A6) | Jointure avec les produits en un `BatchGetItem`, jamais une lecture par ligne |
| Mettre à jour | `UpdateItem` | Quantité bornée entre 1 et le stock, plafonnée par `MAX_QUANTITY_PER_LINE` |
| Supprimer | `DeleteItem`, ou `BatchWriteItem` pour vider | |

### Entrée de wishlist

| Opération | Commande | Détail |
| --- | --- | --- |
| Créer | `PutItem` avec `attribute_not_exists(PK)` | Doublon impossible ; l'échec conditionnel devient une erreur applicative explicite |
| Lire | `Query` (A7) | |
| Mettre à jour | sans objet | Une entrée n'a pas d'état modifiable |
| Supprimer | `DeleteItem` | « Déplacer vers le panier » combine un ajout panier et cette suppression |

## 7. Pagination

La pagination utilise la `LastEvaluatedKey` renvoyée par DynamoDB, encodée en base64url et exposée
comme un curseur opaque. Jamais de pagination par décalage : DynamoDB ne sait pas sauter des
éléments, et un `offset` se paierait en relecture de tout ce qui précède.

Le `limit` est plafonné côté serveur (`MAX_PAGE_SIZE`), de sorte que le coût d'une requête reste
borné et prévisible même face à une requête hostile (P15.20).

## 8. Recherche : ce que DynamoDB ne sait pas faire

DynamoDB n'a pas de recherche plein texte. Trois options existaient :

1. `Scan` avec `FilterExpression` : lit toute la table à chaque frappe. Écarté.
2. Indexer vers OpenSearch ou Algolia : la bonne réponse en production, hors périmètre ici.
3. Charger le catalogue borné par une `Query` sur GSI1, puis filtrer en mémoire.

**L'option 3 est retenue et assumée.** Le catalogue compte 47 produits : une `Query` unique le
ramène, et le filtrage sur le titre, la marque et les tags se fait en mémoire dans le service.
La limite est documentée plutôt que masquée : au-delà de quelques milliers de produits, il faudrait
basculer sur l'option 2.

## 9. Mise en place

```bash
npm run db:up             # DynamoDB Local via Docker, port 8000
npm run db:create-table   # table, index GSI1 et GSI2, TTL sur expiresAt
npm run db:seed           # 8 catégories et 47 produits
npm run test:integration  # vérifie les 11 patterns d'accès
```

Les deux scripts sont idempotents. Les identifiants de produit sont dérivés de leur slug par
hachage, donc un second seed réécrit les mêmes items au lieu d'en empiler de nouveaux.

Le développement ne nécessite **aucun compte AWS** : DynamoDB Local accepte n'importe quelle
signature. Le compte, la table de production et l'utilisateur IAM au moindre privilège arrivent en
phase de déploiement.
