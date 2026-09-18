# Brief : Application E-Commerce prête pour la production

> Source : énoncé de stage « Production-Ready E-Commerce Application, Software Engineer Intern ».
> Traduction française intégrale conservée ici comme référence contractuelle du projet.

## Présentation du projet

En tant que stagiaire ingénieur logiciel, concevoir et développer une application e-commerce
full-stack de niveau production. Le projet ne doit pas se concentrer uniquement sur l'interface
utilisateur, mais aussi sur l'**architecture applicative**, la **logique métier**, le
**développement d'API**, la **conception de la base de données**, la **gestion des erreurs** et
une **structure de code scalable**.

L'objectif est de construire une plateforme e-commerce réaliste où les utilisateurs peuvent
découvrir des produits, gérer leur panier et leur liste de souhaits, et interagir avec les données
de l'application via un backend correctement conçu.

## Fonctionnalités principales

### Vitrine (Storefront)
- Page d'accueil moderne et responsive
- Catégories de produits
- Liste des produits
- Pages de détail produit
- Recherche et filtrage
- Images et informations produit
- Produits associés

### Gestion des utilisateurs et des données
- Gestion des données utilisateur
- Produits
- Catégories
- Panier
- Liste de souhaits

### Panier et liste de souhaits
- Ajouter des produits au panier
- Modifier la quantité d'un produit
- Retirer des articles du panier
- Calculer le sous-total
- Ajouter / retirer des produits de la wishlist
- Empêcher les doublons lorsque c'est pertinent

### Expérience applicative
- Design responsive : mobile, tablette et desktop
- États de chargement
- États vides
- Gestion des erreurs
- Validation des formulaires lorsque applicable
- Gestion du 404 / page non trouvée

## Stack technique imposée

| Couche | Technologie |
| --- | --- |
| Frontend | Next.js • React • TypeScript |
| Backend | Route Handlers / API Routes / Server Actions de Next.js |
| Base de données | AWS DynamoDB |
| Styling | Tailwind CSS |
| Gestion de version | Git & GitHub |

## Conception de la base de données

Utiliser AWS DynamoDB pour concevoir et gérer les données de l'application pour : Utilisateurs,
Produits, Catégories, Panier, Liste de souhaits.

Définir une structure de données claire et documenter comment l'application **lit, crée, met à jour
et supprime** les données.

## Architecture attendue

```
Utilisateur → Application Next.js → Couche Serveur/API → AWS DynamoDB
```

Organiser le projet avec une structure propre, en séparant : composants UI, logique métier,
fonctionnalités API/serveur, opérations de base de données, types et interfaces, fonctions
utilitaires.

## Exigences de développement

- Écrire des composants réutilisables et maintenables
- Utiliser TypeScript correctement
- Implémenter une logique API/serveur structurée
- Gérer les erreurs de base de données et d'application
- Valider les données d'entrée importantes
- Utiliser des variables d'environnement pour la configuration
- Éviter de coder en dur des identifiants sensibles
- Maintenir des commits Git significatifs
- Rédiger une documentation claire et compréhensible

## Rendu

Soumettre via **Internship Dashboard → Task Submission** :

- Lien du dépôt GitHub
- Lien du projet en ligne (si déployé)
- Un `README.md` contenant : présentation du projet, fonctionnalités, stack technique, structure du
  projet, architecture, configuration DynamoDB, variables d'environnement, instructions
  d'installation
- Captures d'écran de l'application terminée

## Résultat attendu

Le projet final doit démontrer un workflow d'ingénierie logicielle complet :

```
Exigences → Architecture → Conception BDD → Développement → API & Logique métier
→ Tests → Documentation → Déploiement
```

> **Important** : se concentrer sur la construction d'une application fonctionnelle et bien
> structurée, avec une gestion des données et une logique métier correctes. Le projet doit
> ressembler à une vraie application e-commerce, pas à un simple site statique.

## Lecture entre les lignes : ce qui est réellement évalué

1. **L'architecture** : séparation nette UI / logique métier / couche API / accès base de données /
   types / utilitaires.
2. **La logique métier** : sous-total, quantités, anti-doublons panier et wishlist.
3. **La conception DynamoDB** : modèle documenté pour 5 entités + les 4 opérations CRUD décrites.
4. **La robustesse** : erreurs, validation, loading, empty, 404.
5. **L'hygiène de dev** : TypeScript sérieux, variables d'environnement (aucun secret en dur),
   commits propres, documentation.

**Hors périmètre explicite** : paiement / checkout, back-office admin, authentification complète
(seulement « gestion des données utilisateur »). Les tests ne sont mentionnés qu'une fois, dans le
workflow final, attendus a minima, non détaillés.
