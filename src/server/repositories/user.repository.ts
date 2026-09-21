import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { documentClient, TABLE_NAME } from "@/lib/dynamodb";
import { NotFoundError } from "@/lib/errors";
import { userKey } from "@/lib/keys";
import { sessionExpiresAt } from "@/lib/ttl";
import type { User, UserProfileUpdate } from "@/schemas/user";

import { deleteAllKeys, queryAllKeys } from "./batch";
import { withDynamoErrors } from "./dynamo-errors";
import { toUser } from "./mappers";

/**
 * Accès au profil utilisateur (P3.3).
 *
 * L'identifiant est **toujours** un paramètre fourni par l'appelant, et cet
 * appelant le tire du cookie de session signé, jamais d'un corps de requête
 * (P15.1). Le repository n'a aucun moyen de deviner qui appelle : c'est
 * précisément ce qui rend la règle vérifiable en remontant les appels.
 *
 * Toute écriture repose l'échéance TTL, de sorte qu'une session active ne
 * disparaît jamais sous son propriétaire (P16.7).
 */
export const userRepository = {
  async findById(userId: string): Promise<User | null> {
    return withDynamoErrors("lecture du profil", async () => {
      const { Item } = await documentClient.send(
        new GetCommand({ TableName: TABLE_NAME, Key: userKey(userId) }),
      );

      return Item ? toUser(Item) : null;
    });
  },

  /**
   * Matérialise la session en base à la première visite.
   *
   * L'écriture porte `attribute_not_exists(PK)` : deux requêtes simultanées de
   * la même session ne peuvent pas se réécrire l'une l'autre, et la date de
   * création d'origine est préservée. Un test d'existence suivi d'une écriture
   * laisserait une fenêtre entre les deux.
   */
  async findOrCreate(userId: string): Promise<User> {
    const existing = await this.findById(userId);
    if (existing) {
      // On renvoie l'horodatage réellement écrit, pas une valeur recalculée à
      // côté : l'appelant doit voir l'état de la base, pas une approximation.
      const lastSeenAt = await this.touch(userId);
      return { ...existing, lastSeenAt };
    }

    const now = new Date();
    const nowIso = now.toISOString();

    return withDynamoErrors("création du profil", async () => {
      try {
        await documentClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              ...userKey(userId),
              entityType: "USER",
              id: userId,
              createdAt: nowIso,
              lastSeenAt: nowIso,
              expiresAt: sessionExpiresAt(now),
            },
            ConditionExpression: "attribute_not_exists(PK)",
          }),
        );
      } catch (error) {
        // Course perdue contre une requête concurrente de la même session :
        // le profil existe désormais, ce qui est exactement le résultat voulu.
        if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
          const created = await this.findById(userId);
          if (created) return created;
        }
        throw error;
      }

      return { id: userId, createdAt: nowIso, lastSeenAt: nowIso };
    });
  },

  /**
   * Marque la session comme active et repousse son échéance.
   *
   * Retourne l'horodatage écrit, pour que l'appelant n'ait pas à le deviner.
   */
  async touch(userId: string): Promise<string> {
    const now = new Date();
    const nowIso = now.toISOString();

    await withDynamoErrors("rafraîchissement de la session", () =>
      documentClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: userKey(userId),
          UpdateExpression: "SET lastSeenAt = :now, expiresAt = :expiresAt",
          ExpressionAttributeValues: {
            ":now": nowIso,
            ":expiresAt": sessionExpiresAt(now),
          },
          // Ne ressuscite pas un profil purgé par le TTL.
          ConditionExpression: "attribute_exists(PK)",
        }),
      ),
    );

    return nowIso;
  },

  /** Droit de rectification (art. 16) : le seul champ que l'utilisateur pilote. */
  async updateProfile(userId: string, update: UserProfileUpdate): Promise<User> {
    const now = new Date();

    return withDynamoErrors("mise à jour du profil", async () => {
      try {
        const { Attributes } = await documentClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: userKey(userId),
            UpdateExpression:
              "SET displayName = :displayName, lastSeenAt = :now, expiresAt = :expiresAt",
            ExpressionAttributeValues: {
              ":displayName": update.displayName,
              ":now": now.toISOString(),
              ":expiresAt": sessionExpiresAt(now),
            },
            ConditionExpression: "attribute_exists(PK)",
            ReturnValues: "ALL_NEW",
          }),
        );

        return toUser(Attributes ?? {});
      } catch (error) {
        // Ici, la condition non remplie veut dire « ce profil n'existe pas »,
        // ce qui est un 404 et non le 409 par défaut de la traduction.
        if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
          throw new NotFoundError("Ce profil n'existe pas ou a expiré.", { cause: error });
        }
        throw error;
      }
    });
  },

  /**
   * Droit à l'effacement (art. 17, P16.13) : supprime toute la partition.
   *
   * C'est le bénéfice concret d'avoir rangé profil, panier et liste de
   * souhaits sous la même clé de partition : l'effacement est une `Query`
   * suivie de suppressions, pas un parcours de cinq collections.
   *
   * Retourne le nombre d'items réellement supprimés, pour que l'appelant
   * puisse le vérifier plutôt que de le supposer.
   */
  async deleteAll(userId: string): Promise<number> {
    return withDynamoErrors("effacement des données d'un utilisateur", async () => {
      // Toutes les pages, et tous les refus rejoués : le nombre retourné est
      // celui des items effectivement supprimés, pas celui des tentatives.
      const keys = await queryAllKeys(documentClient, {
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": userKey(userId).PK },
      });

      await deleteAllKeys(documentClient, TABLE_NAME, keys);

      return keys.length;
    });
  },
};
