import { cacheLife } from "next/cache";

import type { ProductQuery, ProductSearchResult } from "@/server/services/product.service";
import type { Category, CategoryWithCount } from "@/schemas/category";
import type { Product } from "@/schemas/product";
import { productService } from "@/server/services";

/**
 * Couche de lecture mise en cache du catalogue (P10.1).
 *
 * Le catalogue ne change qu'au seed, c'est-à-dire jamais en production entre
 * deux déploiements. Le lire à chaque requête, c'est payer une `Query`
 * DynamoDB pour un contenu identique, et surtout empêcher tout prérendu.
 *
 * `use cache` fait deux choses d'un coup : il mémorise le résultat **et** il
 * autorise Next à l'inclure dans la coquille statique. Sans lui, la simple
 * présence d'un identifiant de requête généré par le SDK AWS suffit à
 * disqualifier la route du prérendu, ce que le build signale explicitement.
 *
 * Ces fonctions ne touchent **jamais** à un cookie ni à une donnée de session.
 * C'est la condition pour être mises en cache : une valeur partagée entre
 * visiteurs ne peut pas dépendre de l'un d'eux.
 *
 * Les arguments font partie de la clé de cache, donc chaque combinaison de
 * filtres a son entrée.
 */

/**
 * Durée de vie commune.
 *
 * `hours` plutôt que `max` : le catalogue est figé par le seed, mais une
 * correction de prix ne doit pas attendre le déploiement suivant pour
 * apparaître.
 */
function catalogueLifetime(): void {
  cacheLife("hours");
}

export async function getCategories(): Promise<CategoryWithCount[]> {
  "use cache";
  catalogueLifetime();

  return productService.listCategories();
}

export async function getCategory(slug: string): Promise<Category> {
  "use cache";
  catalogueLifetime();

  return productService.getCategoryBySlug(slug);
}

export async function searchCatalogue(query: ProductQuery): Promise<ProductSearchResult> {
  "use cache";
  catalogueLifetime();

  return productService.search(query);
}

export async function getProduct(slug: string): Promise<Product> {
  "use cache";
  catalogueLifetime();

  return productService.getBySlug(slug);
}

export async function getRelatedProducts(product: Product): Promise<Product[]> {
  "use cache";
  catalogueLifetime();

  return productService.findRelated(product);
}
