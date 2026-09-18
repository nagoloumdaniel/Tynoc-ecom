import {
  BatchWriteCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import { documentClient, TABLE_NAME } from "@/lib/dynamodb";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { CART_SK_PREFIX, cartItemKey, userKey } from "@/lib/keys";
import { sessionExpiresAt } from "@/lib/ttl";
import type { CartItem } from "@/schemas/cart";

import { withDynamoErrors } from "./dynamo-errors";
import { toCartItem } from "./mappers";

/**
 * Accès au panier (P3.4).
 *
 * Le repository n'applique aucune règle métier : il ne sait pas ce qu'est un
 * stock, ni si un produit existe. Le plafond de quantité lui est **passé en
 * paramètre** par le service, qui l'a calculé à partir du stock et des limites
 * du projet. Ce découpage donne le meilleur des deux : la règle reste dans le
 * service, et son application reste atomique dans la base.
 */
export const cartRepository = {
  /** A6 : toutes les lignes de la partition de l'utilisateur. */
  async list(userId: string): Promise<CartItem[]> {
    return withDynamoErrors("lecture du panier", async () => {
      const { Items } = await documentClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
          ExpressionAttributeValues: {
            ":pk": userKey(userId).PK,
            ":prefix": CART_SK_PREFIX,
          },
        }),
      );

      return (Items ?? []).map(toCartItem);
    });
  },

  /**
   * A8 : crée la ligne ou incrémente sa quantité, en une seule opération.
   *
   * `ADD quantity` traite la création et l'incrément de la même façon, donc
   * aucune lecture préalable et aucune fenêtre de concurrence entre le « est-ce
   * que la ligne existe ? » et l'écriture. C'est de là que vient l'anti-doublon
   * demandé par le brief : la clé de tri contient l'identifiant du produit.
   *
   * La condition refuse l'opération si la quantité résultante dépasserait
   * `maxQuantity`. Vérifier après coup laisserait passer deux clics simultanés.
   */
  async incrementItem(
    userId: string,
    productId: string,
    delta: number,
    maxQuantity: number,
  ): Promise<CartItem> {
    // La condition d'écriture ne couvre pas le cas de la ligne inexistante :
    // `attribute_not_exists` y est vraie, et laisserait créer une ligne
    // au-dessus du plafond ou à quantité nulle. Ces deux préconditions
    // s'évaluent donc avant l'appel.
    if (!Number.isInteger(delta) || delta < 1) {
      throw new ValidationError("La quantité ajoutée doit être un entier positif.");
    }
    if (delta > maxQuantity) {
      throw new ValidationError(`La quantité maximale par article est de ${maxQuantity}.`);
    }

    const now = new Date();
    const nowIso = now.toISOString();

    return withDynamoErrors("ajout au panier", async () => {
      const { Attributes } = await documentClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: cartItemKey(userId, productId),
          UpdateExpression: [
            "ADD quantity :delta",
            "SET productId = :productId,",
            "entityType = :entityType,",
            "updatedAt = :now,",
            "expiresAt = :expiresAt,",
            "addedAt = if_not_exists(addedAt, :now)",
          ].join(" "),
          // Soit la ligne n'existe pas, soit elle a la place d'accueillir
          // l'incrément. Les deux cas sont évalués côté base, donc atomiques.
          ConditionExpression: "attribute_not_exists(SK) OR quantity <= :headroom",
          ExpressionAttributeValues: {
            ":delta": delta,
            ":productId": productId,
            ":entityType": "CART_ITEM",
            ":now": nowIso,
            ":expiresAt": sessionExpiresAt(now),
            ":headroom": maxQuantity - delta,
          },
          ReturnValues: "ALL_NEW",
        }),
      );

      return toCartItem(Attributes ?? {});
    });
  },

  /** Fixe une quantité absolue sur une ligne qui doit déjà exister. */
  async setQuantity(userId: string, productId: string, quantity: number): Promise<CartItem> {
    const now = new Date();

    return withDynamoErrors("mise à jour d'une ligne de panier", async () => {
      try {
        const { Attributes } = await documentClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: cartItemKey(userId, productId),
            UpdateExpression: "SET quantity = :quantity, updatedAt = :now, expiresAt = :expiresAt",
            ConditionExpression: "attribute_exists(SK)",
            ExpressionAttributeValues: {
              ":quantity": quantity,
              ":now": now.toISOString(),
              ":expiresAt": sessionExpiresAt(now),
            },
            ReturnValues: "ALL_NEW",
          }),
        );

        return toCartItem(Attributes ?? {});
      } catch (error) {
        // Contrairement à l'incrément, une condition non remplie veut dire ici
        // « cette ligne n'est plus dans le panier », donc 404 et non 409.
        if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
          throw new NotFoundError("Cet article n'est plus dans votre panier.", { cause: error });
        }
        throw error;
      }
    });
  },

  /** Suppression idempotente : un double clic ne produit pas d'erreur. */
  async removeItem(userId: string, productId: string): Promise<void> {
    await withDynamoErrors("retrait d'une ligne de panier", () =>
      documentClient.send(
        new DeleteCommand({ TableName: TABLE_NAME, Key: cartItemKey(userId, productId) }),
      ),
    );
  },

  /**
   * Vide le panier sans toucher au reste de la partition.
   *
   * Le préfixe de clé de tri fait tout le travail : le profil et la liste de
   * souhaits vivent au même endroit et ne sont pas concernés.
   */
  async clear(userId: string): Promise<void> {
    await withDynamoErrors("vidage du panier", async () => {
      const { Items } = await documentClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
          ExpressionAttributeValues: {
            ":pk": userKey(userId).PK,
            ":prefix": CART_SK_PREFIX,
          },
          ProjectionExpression: "PK, SK",
        }),
      );

      const keys = (Items ?? []).map((item) => ({ PK: item["PK"], SK: item["SK"] }));
      if (keys.length === 0) return;

      for (let start = 0; start < keys.length; start += 25) {
        await documentClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [TABLE_NAME]: keys
                .slice(start, start + 25)
                .map((Key) => ({ DeleteRequest: { Key } })),
            },
          }),
        );
      }
    });
  },
};
