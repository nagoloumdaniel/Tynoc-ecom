/**
 * Alimentation du catalogue (P2.8).
 *
 *   npm run db:up            démarre DynamoDB Local
 *   npm run db:create-table  crée la table et ses index
 *   npm run db:seed          écrit catégories et produits
 *
 * Idempotent : les identifiants sont dérivés des slugs, donc un second passage
 * réécrit les mêmes items au lieu d'en empiler de nouveaux.
 *
 * Chaque item est validé par son schéma Zod **avant** d'être écrit. Un seed qui
 * insère des données que l'application refusera ensuite de lire ne rend service
 * à personne : autant échouer ici, avec le nom du champ fautif.
 */

import { createHash } from "node:crypto";

import { BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

import { documentClient, TABLE_NAME } from "@/lib/dynamodb";
import { productIdFromSlug } from "@/lib/ids";
import { categoryKey, productKey, productListingIndexKey, productSlugIndexKey } from "@/lib/keys";
import { categorySchema } from "@/schemas/category";
import { productSchema } from "@/schemas/product";

import { categories, products, type ProductSeed } from "./catalogue";

/** DynamoDB plafonne `BatchWriteItem` à vingt-cinq requêtes par appel. */
const BATCH_SIZE = 25;

/**
 * Images de substitution déterministes : la même graine produit toujours la
 * même photographie, donc un produit garde son visuel d'un seed à l'autre.
 * Remplacées par de vraies photographies produit en P17.18.
 */
function imageUrl(slug: string, index: number): string {
  return `https://picsum.photos/seed/${slug}-${index}/1200/1200`;
}

const now = new Date().toISOString();

/** Étalement des dates d'ajout au catalogue, en jours. */
const CATALOGUE_SPREAD_DAYS = 540;

/**
 * Date d'entrée d'un produit au catalogue.
 *
 * Le premier seed donnait le même horodatage aux quarante-sept produits. Le
 * tri par nouveauté ne triait donc rien, et la section « Nouveautés » de
 * l'accueil aurait affiché des accessoires de câblage. Le défaut ne se voit
 * pas en base, seulement à l'écran.
 *
 * L'écart est dérivé du slug par hachage : déterministe, donc le seed reste
 * idempotent et l'ordre reste le même d'une exécution à l'autre, tout en
 * mélangeant les catégories comme le ferait un vrai catalogue.
 */
function createdAtFor(slug: string): string {
  const digest = createHash("sha256").update(`created:${slug}`).digest();
  const daysAgo = digest.readUInt16BE(0) % CATALOGUE_SPREAD_DAYS;

  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

function buildCategoryItems() {
  return categories.map((seed) => {
    const category = categorySchema.parse({
      slug: seed.slug,
      name: seed.name,
      description: seed.description,
      position: seed.position,
      image: { url: imageUrl(seed.slug, 0), alt: `Catégorie ${seed.name}` },
      createdAt: now,
      updatedAt: now,
    });

    return {
      ...categoryKey(category.slug),
      entityType: "CATEGORY",
      ...category,
    };
  });
}

function buildProductItems(seeds: ProductSeed[]) {
  const knownCategories = new Set(categories.map((category) => category.slug));

  return seeds.map((seed) => {
    // Une catégorie absente produirait une page de catégorie vide et un
    // produit introuvable au filtrage : autant le voir au seed.
    if (!knownCategories.has(seed.categorySlug)) {
      throw new Error(`Produit "${seed.slug}" : catégorie inconnue "${seed.categorySlug}"`);
    }

    const product = productSchema.parse({
      id: productIdFromSlug(seed.slug),
      slug: seed.slug,
      title: seed.title,
      brand: seed.brand,
      summary: seed.summary,
      description: seed.description,
      priceCents: seed.priceCents,
      stock: seed.stock,
      categorySlug: seed.categorySlug,
      tags: seed.tags,
      images: [
        { url: imageUrl(seed.slug, 0), alt: `${seed.brand} ${seed.title}, vue principale` },
        { url: imageUrl(seed.slug, 1), alt: `${seed.brand} ${seed.title}, vue de détail` },
      ],
      specs: seed.specs,
      createdAt: createdAtFor(seed.slug),
      updatedAt: now,
    });

    return {
      ...productKey(product.id),
      entityType: "PRODUCT",
      ...productListingIndexKey({
        categorySlug: product.categorySlug,
        priceCents: product.priceCents,
        productId: product.id,
      }),
      ...productSlugIndexKey(product.slug),
      ...product,
    };
  });
}

async function writeInBatches(items: Record<string, unknown>[]): Promise<void> {
  for (let start = 0; start < items.length; start += BATCH_SIZE) {
    const batch = items.slice(start, start + BATCH_SIZE);

    let pending = batch.map((item) => ({ PutRequest: { Item: item } }));
    let attempt = 0;

    // `BatchWriteItem` peut n'écrire qu'une partie du lot et renvoyer le reste
    // dans `UnprocessedItems`. Ignorer ce retour, c'est perdre des produits en
    // silence : on rejoue avec une temporisation croissante.
    while (pending.length > 0) {
      const response = await documentClient.send(
        new BatchWriteCommand({ RequestItems: { [TABLE_NAME]: pending } }),
      );

      const unprocessed = response.UnprocessedItems?.[TABLE_NAME] ?? [];
      if (unprocessed.length === 0) break;

      attempt += 1;
      if (attempt > 5) {
        throw new Error(`${unprocessed.length} items non écrits après 5 tentatives`);
      }

      pending = unprocessed as typeof pending;
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 100));
    }
  }
}

async function main(): Promise<void> {
  const categoryItems = buildCategoryItems();
  const productItems = buildProductItems(products);

  const duplicateSlugs = products
    .map((product) => product.slug)
    .filter((slug, index, all) => all.indexOf(slug) !== index);
  if (duplicateSlugs.length > 0) {
    throw new Error(`Slugs en double dans le catalogue : ${duplicateSlugs.join(", ")}`);
  }

  console.log(`Écriture dans ${TABLE_NAME}...`);
  await writeInBatches(categoryItems);
  await writeInBatches(productItems);

  const outOfStock = productItems.filter((item) => item.stock === 0).length;
  const lowStock = productItems.filter((item) => item.stock > 0 && item.stock <= 5).length;
  const prices = productItems.map((item) => item.priceCents);

  console.log(`${categoryItems.length} catégories et ${productItems.length} produits écrits.`);
  console.log(
    `Dont ${outOfStock} en rupture et ${lowStock} sous le seuil de stock faible, ` +
      `prix de ${Math.min(...prices) / 100} € à ${Math.max(...prices) / 100} €.`,
  );
}

main().catch((error: unknown) => {
  console.error("Échec du seed :", error);
  process.exitCode = 1;
});
