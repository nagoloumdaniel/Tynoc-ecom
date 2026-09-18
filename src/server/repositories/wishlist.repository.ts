import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import { documentClient, TABLE_NAME } from "@/lib/dynamodb";
import { WISHLIST_SK_PREFIX, userKey, wishlistItemKey } from "@/lib/keys";
import { sessionExpiresAt } from "@/lib/ttl";
import type { WishlistItem } from "@/schemas/wishlist";

import { withDynamoErrors } from "./dynamo-errors";
import { toWishlistItem } from "./mappers";

/**
 * Accès à la liste de souhaits (P3.5).
 *
 * `add` échoue sur un doublon, et c'est volontaire à ce niveau : la base dit ce
 * qui s'est passé, le service décide ensuite que ce n'est pas une erreur pour
 * l'utilisateur et rend l'opération idempotente (P4.5). Décider ici que le
 * doublon est acceptable priverait le service de l'information.
 */
export const wishlistRepository = {
  /** A7 : toutes les entrées de la partition de l'utilisateur. */
  async list(userId: string): Promise<WishlistItem[]> {
    return withDynamoErrors("lecture de la liste de souhaits", async () => {
      const { Items } = await documentClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
          ExpressionAttributeValues: {
            ":pk": userKey(userId).PK,
            ":prefix": WISHLIST_SK_PREFIX,
          },
        }),
      );

      return (Items ?? []).map(toWishlistItem);
    });
  },

  /**
   * A9 : ajout sans doublon possible.
   *
   * La condition `attribute_not_exists(SK)` rend l'écriture atomique : pas de
   * lecture préalable, donc pas de fenêtre entre la vérification et l'écriture.
   * Un échec de condition ressort en `ConflictError` par la traduction
   * commune des erreurs.
   */
  async add(userId: string, productId: string): Promise<WishlistItem> {
    const now = new Date();
    const nowIso = now.toISOString();

    return withDynamoErrors("ajout à la liste de souhaits", async () => {
      await documentClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            ...wishlistItemKey(userId, productId),
            entityType: "WISHLIST_ITEM",
            productId,
            addedAt: nowIso,
            expiresAt: sessionExpiresAt(now),
          },
          ConditionExpression: "attribute_not_exists(SK)",
        }),
      );

      return { productId, addedAt: nowIso };
    });
  },

  /** Suppression idempotente, comme pour le panier. */
  async remove(userId: string, productId: string): Promise<void> {
    await withDynamoErrors("retrait de la liste de souhaits", () =>
      documentClient.send(
        new DeleteCommand({ TableName: TABLE_NAME, Key: wishlistItemKey(userId, productId) }),
      ),
    );
  },

  /**
   * Présence d'un produit dans la liste.
   *
   * Un `GetItem` sur la clé exacte, avec une projection réduite : le bouton
   * favori d'une fiche produit n'a pas besoin de la liste entière pour savoir
   * s'il doit être rempli ou vide.
   */
  async has(userId: string, productId: string): Promise<boolean> {
    return withDynamoErrors("vérification de présence en liste de souhaits", async () => {
      const { Item } = await documentClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: wishlistItemKey(userId, productId),
          ProjectionExpression: "SK",
        }),
      );

      return Item !== undefined;
    });
  },
};
