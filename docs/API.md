# API HTTP

> Référence des route handlers exposés sous `/api`. Les Server Actions, qui
> servent les mêmes cas depuis l'interface, sont décrites en fin de document.
> Le modèle de données est dans [DATA-MODEL.md](./DATA-MODEL.md).

## 1. Principes

### Enveloppe unique

Toutes les réponses ont la même forme, succès comme échec. Sans cela, un client
doit connaître le format particulier de chaque endpoint, et le premier oubli
renvoie une trace d'appels.

```jsonc
// Succès
{ "success": true, "data": { } }

// Échec
{
  "success": false,
  "error": {
    "code": "VALIDATION",
    "message": "Paramètres de requête invalides.",
    "fields": { "page": "Expected number, received string" },
    "requestId": "0f2c1a9e-..."
  }
}
```

`fields` n'apparaît que sur une erreur de validation. `requestId` est toujours
présent : c'est lui qui relie ce que l'utilisateur a vu au log serveur
correspondant.

### Codes d'erreur et statuts

| `code` | Statut | Signification |
| --- | --- | --- |
| `VALIDATION` | 400 | Paramètre, corps ou champ refusé à la frontière |
| `FORBIDDEN` | 403 | Écriture émise depuis une autre origine (`Origin` ou `Sec-Fetch-Site`) |
| `NOT_FOUND` | 404 | La ressource demandée n'existe pas |
| `CONFLICT` | 409 | L'opération contredit l'état actuel (stock, plafond) |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Corps d'écriture envoyé sans `Content-Type: application/json` |
| `DATABASE` | 500 | Défaillance de la couche de données |
| `INTERNAL` | 500 | Tout le reste |

Les écritures (`POST`, `PATCH`, `DELETE`) doivent donc venir de la même origine et, quand elles
portent un corps, le déclarer en `application/json`. Exiger ce type impose au navigateur un
contrôle CORS préalable, qu'aucune origine étrangère ne franchit ; un corps `text/plain`, lui,
partirait sans contrôle (P12.3).

Le statut est porté par l'erreur elle-même, jamais décidé par la route. Les
messages de `DATABASE` et `INTERNAL` sont remplacés par un message générique :
un message de base de données contient un nom de table, un nom d'index et
parfois un fragment de requête.

### Identité

**Aucun endpoint n'accepte d'identifiant d'utilisateur.** L'identité est
dérivée du cookie de session signé, côté serveur, à chaque requête. Les schémas
de corps sont stricts : un `userId` glissé dans la charge utile produit un 400,
il n'est pas ignoré.

Le cookie est posé par `proxy.ts` avant tout rendu. Il est `httpOnly`,
`SameSite=Lax`, signé en HMAC-SHA256, et porte le préfixe `__Host-` en
production.

### Bornes

| Garde-fou | Valeur |
| --- | --- |
| Taille d'un corps de requête | 16 Kio |
| Taille de page du listing | 48 maximum, 12 par défaut |
| Quantité par ligne de panier | 10 |
| Lignes distinctes dans un panier | 50 |
| Produits en liste de souhaits | 100 |
| Longueur d'une recherche | 80 caractères |

Un paramètre hors bornes est refusé en 400 plutôt que silencieusement ramené
dans les clous : ramener sans le dire ferait croire à l'appelant que sa requête
a été honorée telle quelle.

---

## 2. Catalogue

### `GET /api/products`

Recherche, filtres, tri et pagination.

| Paramètre | Type | Défaut | Notes |
| --- | --- | --- | --- |
| `q` | chaîne | | Titre, marque, résumé, tags et catégorie. Insensible à la casse et aux accents |
| `category` | slug | | Restreint à une catégorie |
| `minPrice` | entier | | En **centimes** |
| `maxPrice` | entier | | En centimes. Bornes inversées remises dans l'ordre |
| `inStock` | `true` / `false` | | Exclut les produits en rupture |
| `sort` | `newest`, `price-asc`, `price-desc`, `name` | `newest` | |
| `page` | entier ≥ 1 | `1` | |
| `pageSize` | entier 1 à 48 | `12` | |

Tout autre paramètre produit un 400.

```bash
curl 'http://localhost:3000/api/products?category=casques&inStock=true&sort=price-asc'
```

```jsonc
{
  "success": true,
  "data": {
    "items": [ /* Product[] */ ],
    "total": 9,
    "page": 1,
    "pageSize": 12,
    "pageCount": 1
  }
}
```

`total` porte sur l'ensemble filtré, pas sur la page.

### `GET /api/products/[slug]`

Fiche produit complète. Le slug est celui de l'URL publique.

- `200` avec le produit.
- `404` si le slug est inconnu.

### `GET /api/categories`

Les huit catégories, dans l'ordre voulu par le marchand, chacune enrichie de
`productCount` pour éviter une seconde requête côté navigation.

---

## 3. Panier

Toutes les mutations renvoient le **récapitulatif complet**, pour que le client
obtienne le nouveau total et le nouveau compteur sans second aller-retour. Le
total est toujours recalculé côté serveur à partir du prix courant du produit.

```jsonc
// Forme du récapitulatif
{
  "lines": [
    {
      "product": { },
      "quantity": 2,
      "addedAt": "2026-09-19T08:00:00.000Z",
      "lineTotalCents": 109800,
      "availability": "in-stock",
      "exceedsStock": false
    }
  ],
  "itemCount": 2,
  "subtotalCents": 109800,
  "orphanProductIds": []
}
```

`orphanProductIds` liste les lignes dont le produit a quitté le catalogue.
Elles sont signalées plutôt que supprimées en silence, et ne comptent pas dans
le total faute de prix.

### `GET /api/cart`

`200` avec le récapitulatif. Un panier vide renvoie des compteurs à zéro, pas
une erreur.

### `POST /api/cart`

```jsonc
{ "productId": "prd_a1b2c3d4e5f6", "quantity": 2 }
```

`201` avec le récapitulatif augmenté d'un champ `adjusted`. Ce champ vaut
`true` quand la quantité appliquée diffère de celle demandée, parce que le
stock ou le plafond s'y opposaient : sans lui, l'interface ne peut pas
expliquer pourquoi l'utilisateur voit 3 après en avoir demandé 8.

Le même produit ajouté deux fois **incrémente** la ligne existante. L'unicité
vient de la clé de stockage, pas d'un contrôle applicatif.

| Cas | Statut |
| --- | --- |
| Produit inconnu | 404 |
| Produit en rupture | 409 |
| Ligne déjà au maximum possible | 409 |
| Plafond de lignes atteint | 409 |
| Corps invalide ou champ inconnu | 400 |

### `PATCH /api/cart`

```jsonc
{ "productId": "prd_a1b2c3d4e5f6", "quantity": 5 }
```

Quantité absolue, plancher 1, plafonnée au stock. `200` avec le récapitulatif
et `adjusted`. `404` si la ligne n'est pas dans le panier.

### `DELETE /api/cart`

| Appel | Effet | Statut |
| --- | --- | --- |
| `DELETE /api/cart?productId=prd_…` | Retire la ligne | `200` avec le récapitulatif |
| `DELETE /api/cart` | Vide le panier | `204` |

Le produit passe par la query string : un corps sur un `DELETE` est mal pris en
charge par une partie des clients et des intermédiaires HTTP.

---

## 4. Liste de souhaits

### `GET /api/wishlist`

`200` avec les entrées, les plus récentes en premier, chacune jointe à son
produit et à sa disponibilité.

### `POST /api/wishlist`

```jsonc
{ "productId": "prd_a1b2c3d4e5f6" }
```

| Cas | Statut | Corps |
| --- | --- | --- |
| Entrée créée | `201` | `{ "added": true, "items": [...] }` |
| Déjà présente | `200` | `{ "added": false, "items": [...] }` |
| Produit inconnu | `404` | |
| Liste pleine | `409` | |

**Pas de 409 sur doublon**, contrairement à ce que prévoyait la roadmap.
L'ajout est idempotent : mettre deux fois un produit en favori n'est pas une
erreur du point de vue du visiteur, donc pas un échec HTTP. Le champ `added`
dit ce qui s'est réellement passé.

Un produit en rupture est acceptable ici : c'est même l'usage principal d'une
liste de souhaits.

### `DELETE /api/wishlist?productId=prd_…`

`204`. Le paramètre est obligatoire ; son absence produit un 400. Retirer une
entrée déjà absente n'est pas une erreur.

---

## 5. Server Actions

Les mêmes opérations sont exposées aux composants par des Server Actions, qui
évitent un aller-retour HTTP explicite et permettent à Next de renvoyer la page
re-rendue dans la même réponse.

| Action | Module | Retour |
| --- | --- | --- |
| `addToCartAction` | `server/actions/cart` | Récapitulatif + `adjusted` |
| `setCartQuantityAction` | `server/actions/cart` | Récapitulatif + `adjusted` |
| `removeFromCartAction` | `server/actions/cart` | Récapitulatif |
| `toggleWishlistAction` | `server/actions/wishlist` | `{ inWishlist }` |
| `removeFromWishlistAction` | `server/actions/wishlist` | Entrées restantes |
| `moveToCartAction` | `server/actions/wishlist` | Récapitulatif du panier |

Toutes renvoient un `ActionResult<T>` :

```ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code; message; fields?; requestId } };
```

Une action ne lève **jamais** : Next sérialise l'exception vers le navigateur,
et le message d'une panne interne y arriverait tel quel.

Une Server Action est un endpoint POST public. Le fait qu'elle ne soit appelée
que depuis un formulaire rendu par nos soins n'est pas une frontière de
sécurité : chacune revalide ses entrées et redérive l'identité, exactement
comme une route HTTP. Next ajoute de son côté une vérification d'origine et une
limite de corps.

---

## 6. Essayer l'API

```bash
npm run db:up && npm run db:create-table && npm run db:seed
npm run dev

curl -s 'http://localhost:3000/api/categories' | jq
curl -s 'http://localhost:3000/api/products?q=casque&sort=price-asc' | jq '.data.total'

# Le panier exige la session : conserver le cookie entre les appels.
curl -s -c jar.txt -b jar.txt -X POST http://localhost:3000/api/cart \
  -H 'content-type: application/json' \
  -d '{"productId":"prd_…","quantity":2}' | jq
curl -s -c jar.txt -b jar.txt http://localhost:3000/api/cart | jq '.data.subtotalCents'
```

Sans le cookie, chaque appel repart sur une session neuve et le panier paraît
toujours vide.
