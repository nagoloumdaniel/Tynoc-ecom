# Politiques IAM (P12.3)

Deux identités, deux politiques, et aucune ne porte `dynamodb:*`.

| Fichier | Identité | Usage |
| --- | --- | --- |
| `iam-runtime-policy.json` | L'application déployée (clés `APP_AWS_*` sur Vercel) | Lire et écrire des items, interroger les index |
| `iam-provisioning-policy.json` | Le développeur, en local, une fois | `npm run db:create-table`, puis `npm run db:seed` |

## Pourquoi deux identités

L'application en production n'a aucune raison de pouvoir créer, modifier ou supprimer une table.
Si ses clés fuient, le pire possible doit rester l'accès aux items de **cette** table, pas la
destruction de la table ni l'accès au reste du compte.

## Comment la liste a été établie

Par relevé du code, pas par supposition : chaque `new XxxCommand` de `src/` et de `scripts/` a
été recensé.

| Opération | Où |
| --- | --- |
| `GetItem`, `BatchGetItem`, `Query` | Lectures des repositories |
| `PutItem`, `UpdateItem`, `DeleteItem` | Écritures des repositories |
| `BatchWriteItem` | Vidage du panier, effacement des données, seed |
| `Query` sur `index/*` | GSI1 (listing par catégorie et prix), GSI2 (recherche par slug) |
| `CreateTable`, `DescribeTable`, `UpdateTimeToLive` | `scripts/create-table.ts` |

Aucune opération `Scan` : le modèle de données n'en utilise pas (voir `docs/DATA-MODEL.md`), et
la refuser au niveau IAM garantit qu'une régression ne pourra pas en introduire une en silence.

## À la mise en ligne (P14)

Remplacer `ACCOUNT_ID` par l'identifiant du compte, et `tynoc-ecom-prod` par le nom réel de la
table si différent. La région `eu-west-3` (Paris) correspond à `APP_AWS_REGION`.
