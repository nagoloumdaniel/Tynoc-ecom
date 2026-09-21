import {
  BatchWriteCommand,
  QueryCommand,
  type BatchWriteCommandOutput,
  type QueryCommandOutput,
} from "@aws-sdk/lib-dynamodb";

/**
 * Suppressions en lot, sans perte silencieuse (P12.1).
 *
 * Deux pièges de l'API DynamoDB, que le vidage du panier et l'effacement des
 * données tombaient tous les deux dans :
 *
 * - `BatchWriteItem` peut **réussir en n'ayant pas tout écrit**. Sous
 *   limitation de débit, les requêtes refusées reviennent dans
 *   `UnprocessedItems`, sans erreur. Les ignorer, c'est annoncer un effacement
 *   alors qu'une partie des données est toujours là.
 * - `Query` s'arrête à 1 Mo et signale la suite par `LastEvaluatedKey`. Ne lire
 *   que la première page, c'est n'effacer que la première page.
 *
 * Pour un droit à l'effacement, « presque tout » n'est pas une réponse.
 * Ce module rejoue donc les refus avec un recul exponentiel, et **lève** s'ils
 * persistent : l'appelant reçoit une erreur, jamais un faux succès.
 */

/** Plafond imposé par DynamoDB pour un `BatchWriteItem`. */
const BATCH_WRITE_LIMIT = 25;

/** Nombre de rejeux des requêtes refusées avant d'abandonner. */
const MAX_RETRIES = 5;

/** Premier délai de recul ; il double à chaque rejeu. */
const BASE_DELAY_MS = 50;

export type ItemKey = { PK: unknown; SK: unknown };

/** Contrat minimal du client, pour tester sans base. */
export interface BatchClient {
  send(command: QueryCommand): Promise<QueryCommandOutput>;
  send(command: BatchWriteCommand): Promise<BatchWriteCommandOutput>;
}

/** Pause injectable, pour que les tests ne dorment pas réellement. */
export type Sleep = (milliseconds: number) => Promise<void>;

const realSleep: Sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Toutes les clés d'une requête, pages suivantes comprises. */
export async function queryAllKeys(
  client: BatchClient,
  input: {
    TableName: string;
    KeyConditionExpression: string;
    ExpressionAttributeValues: Record<string, unknown>;
  },
): Promise<ItemKey[]> {
  const keys: ItemKey[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const page = await client.send(
      new QueryCommand({ ...input, ProjectionExpression: "PK, SK", ExclusiveStartKey }),
    );

    for (const item of page.Items ?? []) keys.push({ PK: item["PK"], SK: item["SK"] });
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey !== undefined);

  return keys;
}

/**
 * Supprime toutes les clés, par lots de 25, en rejouant les refus.
 *
 * Lève si des suppressions restent refusées après le dernier rejeu : le
 * message dit combien, pour que l'erreur soit exploitable.
 */
export async function deleteAllKeys(
  client: BatchClient,
  tableName: string,
  keys: ItemKey[],
  sleep: Sleep = realSleep,
): Promise<void> {
  for (let start = 0; start < keys.length; start += BATCH_WRITE_LIMIT) {
    let pending: { DeleteRequest: { Key: Record<string, unknown> } }[] = keys
      .slice(start, start + BATCH_WRITE_LIMIT)
      .map((Key) => ({ DeleteRequest: { Key } }));

    for (let attempt = 0; pending.length > 0; attempt += 1) {
      if (attempt > MAX_RETRIES) {
        throw new Error(
          `${pending.length} suppression(s) toujours refusée(s) après ${MAX_RETRIES} rejeux.`,
        );
      }

      if (attempt > 0) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));

      const { UnprocessedItems } = await client.send(
        new BatchWriteCommand({ RequestItems: { [tableName]: pending } }),
      );

      pending = (UnprocessedItems?.[tableName] ?? []).flatMap((request) =>
        request.DeleteRequest?.Key ? [{ DeleteRequest: { Key: request.DeleteRequest.Key } }] : [],
      );
    }
  }
}
