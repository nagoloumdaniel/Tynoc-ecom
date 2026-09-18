import { BatchGetCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import { decodeCursor, encodeCursor, type PageKey } from "@/lib/cursor";
import { documentClient, TABLE_NAME } from "@/lib/dynamodb";
import {
  GSI1_NAME,
  GSI2_NAME,
  PRODUCTS_PARTITION,
  categoryListingPrefix,
  productKey,
} from "@/lib/keys";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/limits";
import type { Page } from "@/schemas/common";
import type { Product } from "@/schemas/product";

import { withDynamoErrors } from "./dynamo-errors";
import { toProduct } from "./mappers";

/**
 * Accès aux produits (P3.1).
 *
 * Ce fichier ne contient **aucune règle métier** : ni recherche, ni notion de
 * « produit associé », ni décision sur ce qu'est un résultat pertinent. Il lit,
 * il traduit, il rend des entités du domaine. La roadmap plaçait `search` et
 * `findRelated` ici tout en les décrivant aussi en P4.6 et P4.7 ; la même
 * logique dans deux couches n'existe pas, elle appartient au service.
 *
 * Il ne décide pas non plus qu'une absence est une erreur : `findById` rend
 * `null`. C'est au service de choisir entre un 404 et une liste vide.
 */

/** Plafond absolu d'une lecture non paginée, garde-fou de coût (P15.20). */
const MAX_CATALOGUE_ITEMS = 500;

/** Taille de page interne utilisée pour parcourir le catalogue complet. */
const DEFAULT_SCAN_PAGE = 100;

interface FindAllOptions {
  /** Taille des pages internes. Exposée pour rendre le bouclage testable. */
  pageSize?: number;
}

interface FindPageOptions {
  limit?: number;
  cursor?: string;
  categorySlug?: string;
  /** Inverse le tri par prix : l'index fait le travail, pas la mémoire. */
  descending?: boolean;
}

/** Conditions de clé du listing, communes aux lectures complètes et paginées. */
function listingKeyCondition(categorySlug?: string) {
  if (categorySlug === undefined) {
    return {
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": PRODUCTS_PARTITION } as Record<string, string>,
    };
  }

  return {
    KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :prefix)",
    ExpressionAttributeValues: {
      ":pk": PRODUCTS_PARTITION,
      ":prefix": categoryListingPrefix(categorySlug),
    } as Record<string, string>,
  };
}

/**
 * Parcourt l'index jusqu'à épuisement, en suivant la `LastEvaluatedKey`.
 *
 * DynamoDB borne une réponse à 1 Mo : une `Query` peut donc s'arrêter avant la
 * fin même sans `Limit`. Un repository qui ne boucle pas renvoie une liste
 * silencieusement tronquée, ce qui est pire qu'une erreur.
 */
async function queryAll(categorySlug: string | undefined, pageSize: number): Promise<Product[]> {
  const condition = listingKeyCondition(categorySlug);
  const items: Product[] = [];
  let startKey: PageKey | undefined;

  do {
    const response = await documentClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI1_NAME,
        ...condition,
        Limit: pageSize,
        ExclusiveStartKey: startKey,
      }),
    );

    for (const item of response.Items ?? []) {
      items.push(toProduct(item));
    }

    startKey = response.LastEvaluatedKey as PageKey | undefined;
  } while (startKey !== undefined && items.length < MAX_CATALOGUE_ITEMS);

  return items;
}

export const productRepository = {
  /** A1 : lecture par identifiant, une seule requête. */
  async findById(productId: string): Promise<Product | null> {
    return withDynamoErrors("lecture d'un produit par identifiant", async () => {
      const { Item } = await documentClient.send(
        new GetCommand({ TableName: TABLE_NAME, Key: productKey(productId) }),
      );

      return Item ? toProduct(Item) : null;
    });
  },

  /** A2 : résolution d'un slug d'URL par l'index dédié. */
  async findBySlug(slug: string): Promise<Product | null> {
    return withDynamoErrors("résolution d'un slug produit", async () => {
      const { Items } = await documentClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: GSI2_NAME,
          KeyConditionExpression: "GSI2PK = :pk",
          ExpressionAttributeValues: { ":pk": `SLUG#${slug}` },
          Limit: 1,
        }),
      );

      const item = Items?.[0];
      return item ? toProduct(item) : null;
    });
  },

  /**
   * A4 : catalogue complet.
   *
   * Sert la recherche et le filtrage, que le service applique en mémoire.
   * DynamoDB ne fait pas de plein texte, et le catalogue est borné : le choix
   * est assumé et documenté dans `docs/DATA-MODEL.md` § 8.
   */
  async findAll(options: FindAllOptions = {}): Promise<Product[]> {
    return withDynamoErrors("lecture du catalogue", () =>
      queryAll(undefined, options.pageSize ?? DEFAULT_SCAN_PAGE),
    );
  },

  /** A3 : produits d'une catégorie, déjà triés par prix croissant par l'index. */
  async findByCategory(categorySlug: string, options: FindAllOptions = {}): Promise<Product[]> {
    return withDynamoErrors("lecture d'une catégorie", () =>
      queryAll(categorySlug, options.pageSize ?? DEFAULT_SCAN_PAGE),
    );
  },

  /**
   * Listing paginé par curseur opaque (P3.8).
   *
   * Pagination par `LastEvaluatedKey`, jamais par décalage : DynamoDB ne sait
   * pas sauter des éléments, et un `offset` se paierait en relecture de tout ce
   * qui précède.
   */
  async findPage(options: FindPageOptions = {}): Promise<Page<Product>> {
    const limit = Math.min(Math.max(options.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    // Décodé hors du try : un curseur invalide est une erreur d'entrée (400),
    // pas une panne de base (500).
    const startKey = options.cursor === undefined ? undefined : decodeCursor(options.cursor);

    return withDynamoErrors("listing paginé des produits", async () => {
      const response = await documentClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: GSI1_NAME,
          ...listingKeyCondition(options.categorySlug),
          Limit: limit,
          ExclusiveStartKey: startKey,
          ScanIndexForward: options.descending !== true,
        }),
      );

      const lastKey = response.LastEvaluatedKey as PageKey | undefined;

      return {
        items: (response.Items ?? []).map(toProduct),
        ...(lastKey === undefined ? {} : { nextCursor: encodeCursor(lastKey) }),
      };
    });
  },

  /**
   * Lecture groupée, pour joindre un panier ou une liste de souhaits à ses
   * produits en une requête au lieu d'une par ligne.
   *
   * Les identifiants inconnus sont simplement absents du résultat : un produit
   * retiré du catalogue laisse une ligne orpheline, que le service signale.
   */
  async findManyByIds(productIds: string[]): Promise<Product[]> {
    const unique = [...new Set(productIds)];
    if (unique.length === 0) return [];

    return withDynamoErrors("lecture groupée de produits", async () => {
      const found: Product[] = [];

      // `BatchGetItem` plafonne à 100 clés par appel.
      for (let start = 0; start < unique.length; start += 100) {
        let keys = unique.slice(start, start + 100).map((id) => productKey(id));
        let attempt = 0;

        while (keys.length > 0) {
          const response = await documentClient.send(
            new BatchGetCommand({ RequestItems: { [TABLE_NAME]: { Keys: keys } } }),
          );

          for (const item of response.Responses?.[TABLE_NAME] ?? []) {
            found.push(toProduct(item));
          }

          // Une réponse partielle est normale sous charge. L'ignorer perdrait
          // des lignes de panier en silence.
          const pending = response.UnprocessedKeys?.[TABLE_NAME]?.Keys ?? [];
          if (pending.length === 0) break;

          attempt += 1;
          if (attempt > 5) {
            throw new Error(`${pending.length} clés non lues après 5 tentatives`);
          }

          keys = pending as typeof keys;
          await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 50));
        }
      }

      return found;
    });
  },
};
