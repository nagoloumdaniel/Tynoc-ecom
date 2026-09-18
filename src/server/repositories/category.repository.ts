import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import { documentClient, TABLE_NAME } from "@/lib/dynamodb";
import { CATEGORY_COLLECTION_PK, CATEGORY_SK_PREFIX, categoryKey } from "@/lib/keys";
import type { Category } from "@/schemas/category";

import { withDynamoErrors } from "./dynamo-errors";
import { toCategory } from "./mappers";

/**
 * Accès aux catégories (P3.2).
 *
 * Les catégories se lisent toujours en bloc : elles alimentent la navigation,
 * le pied de page et les filtres. Elles vivent donc dans une partition unique
 * que `begins_with` parcourt d'une seule requête.
 *
 * Le tri par `position` se fait en mémoire, et c'est un choix : créer un index
 * pour ordonner huit éléments coûterait plus cher en écriture et en complexité
 * qu'il ne rapporterait en lecture.
 */
export const categoryRepository = {
  /** A5 : toutes les catégories, dans l'ordre voulu par le marchand. */
  async findAll(): Promise<Category[]> {
    return withDynamoErrors("lecture des catégories", async () => {
      const { Items } = await documentClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
          ExpressionAttributeValues: {
            ":pk": CATEGORY_COLLECTION_PK,
            ":prefix": CATEGORY_SK_PREFIX,
          },
        }),
      );

      return (Items ?? [])
        .map(toCategory)
        .sort(
          (left, right) => left.position - right.position || left.name.localeCompare(right.name),
        );
    });
  },

  /** Lecture directe : le slug fait partie de la clé, donc un `GetItem` suffit. */
  async findBySlug(slug: string): Promise<Category | null> {
    return withDynamoErrors("lecture d'une catégorie", async () => {
      const { Item } = await documentClient.send(
        new GetCommand({ TableName: TABLE_NAME, Key: categoryKey(slug) }),
      );

      return Item ? toCategory(Item) : null;
    });
  },
};
