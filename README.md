# Tynoc E-Commerce

Application e-commerce full-stack construite avec Next.js, TypeScript et AWS DynamoDB.

> 🚧 **Projet en cours de construction.** Ce README est un socle ; sa version complète
> (8 sections exigées par le brief) est livrée en phase P13 de la roadmap.

## Documentation

| Document | Contenu |
| --- | --- |
| [docs/BRIEF.md](docs/BRIEF.md) | Le besoin : énoncé traduit, référence contractuelle |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Plan d'exécution complet : 18 phases, 216 tâches |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Périmètre, direction artistique, états d'écran, parcours, couches |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Single-table design, 11 patterns d'accès, opérations CRUD |
| [AGENTS.md](AGENTS.md) | Conventions de code et règle de dépendance entre couches |

## Stack technique

- **Next.js 16.3** : App Router, Server Components, Server Actions
- **React 19.2**
- **TypeScript 5** : mode strict renforcé (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`…)
- **Tailwind CSS v4** : configuration par `@theme`
- **AWS DynamoDB** : single-table design
- **Zod 4** : validation runtime et source de vérité des types

## Architecture

```text
Utilisateur → Application Next.js → Couche Serveur/API → AWS DynamoDB
```

Le code est organisé en couches à sens unique :

```text
app/ → server/actions/ + app/api/ → server/services/ → server/repositories/ → lib/dynamodb
```

- `server/services/` porte **toute** la logique métier, pure et testable.
- `server/repositories/` est le **seul** endroit qui connaît DynamoDB.
- Aucun composant UI n'importe un repository.

## Installation

```bash
git clone https://github.com/Nagoloum/Tynoc-ecom.git
cd Tynoc-ecom
npm install
cp .env.example .env.local   # puis renseigner les valeurs
npm run db:up                # DynamoDB Local via Docker
npm run db:create-table      # table, index et TTL
npm run db:seed              # 8 catégories et 47 produits
npm run dev
```

L'application démarre sur <http://localhost:3000>.

Le développement ne demande **aucun compte AWS** : DynamoDB Local tourne dans Docker et accepte
n'importe quelle signature. Les valeurs de `.env.local` peuvent donc être factices en local, à
l'exception de `SESSION_SECRET`.

### Variables d'environnement

Voir [.env.example](.env.example) pour la liste complète et commentée.

| Variable | Rôle |
| --- | --- |
| `APP_AWS_REGION` | Région AWS de la table (ex. `eu-west-3`) |
| `APP_AWS_ACCESS_KEY_ID` | Clé d'accès IAM |
| `APP_AWS_SECRET_ACCESS_KEY` | Clé secrète IAM |
| `DYNAMODB_TABLE_NAME` | Nom de la table (une par environnement) |
| `DYNAMODB_ENDPOINT` | Optionnel : endpoint DynamoDB Local |
| `SESSION_SECRET` | Secret de signature du cookie de session (≥ 32 caractères) |
| `NEXT_PUBLIC_SITE_URL` | URL publique du site |

> Le préfixe `APP_AWS_` est volontaire : le runtime Lambda de Vercel réserve les noms
> `AWS_REGION`, `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY`.

Les variables sont validées au démarrage par [src/lib/env.ts](src/lib/env.ts) : une configuration
incomplète fait échouer le boot avec la liste des variables manquantes, plutôt que de produire un
`undefined` silencieux.

## Commandes

```bash
npm run dev           # serveur de développement
npm run build         # build de production
npm run typecheck     # vérification des types
npm run lint          # ESLint
npm run format        # Prettier
npm test              # tests unitaires
npm run test:watch    # tests unitaires en continu
npm run test:integration  # tests contre DynamoDB Local (conteneur requis)
npm run verify        # typecheck + lint + format + tests, à passer avant tout commit

npm run db:up         # démarre DynamoDB Local
npm run db:down       # arrête DynamoDB Local
npm run db:create-table   # création idempotente de la table et des index
npm run db:seed           # alimentation idempotente du catalogue
```

## Avancement

| Phase | Statut |
| --- | --- |
| P0 : Fondations du dépôt | ✅ Terminée |
| P1 : Cadrage & direction artistique | ✅ Terminée |
| P2 : Modèle de données & DynamoDB | ✅ Terminée |
| P3 : Couche repositories | ✅ Terminée |
| P4 : Couche services | ⬜ En cours |
| P5 → P17 | ⬜ Voir la [roadmap](docs/ROADMAP.md) |
