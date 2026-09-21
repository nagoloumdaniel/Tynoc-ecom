import { BatchWriteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it, vi } from "vitest";

import {
  deleteAllKeys,
  queryAllKeys,
  type BatchClient,
  type ItemKey,
  type Sleep,
} from "@/server/repositories/batch";

/**
 * Suppressions en lot (P12.1).
 *
 * Ces tests existent parce que le défaut qu'ils couvrent est invisible contre
 * DynamoDB Local : il ne limite jamais le débit, donc `UnprocessedItems`
 * revient toujours vide. Seul un faux client peut simuler un refus.
 */

const TABLE = "test-table";
const noSleep = vi.fn<Sleep>(async () => {});

function keys(count: number): ItemKey[] {
  return Array.from({ length: count }, (_, index) => ({ PK: "USER#u", SK: `CART#${index}` }));
}

/** Faux client qui refuse, à chaque appel, les requêtes listées par `refuse`. */
function fakeClient(refuse: (call: number, batch: unknown[]) => unknown[]) {
  const writes: unknown[][] = [];

  const client = {
    send: vi.fn(async (command: QueryCommand | BatchWriteCommand) => {
      if (!(command instanceof BatchWriteCommand)) throw new Error("inattendu");

      const batch = command.input.RequestItems?.[TABLE] ?? [];
      writes.push(batch);
      const refused = refuse(writes.length, batch);

      return { UnprocessedItems: refused.length > 0 ? { [TABLE]: refused } : {} };
    }),
  } as unknown as BatchClient;

  return { client, writes };
}

describe("deleteAllKeys", () => {
  it("découpe en lots de 25", async () => {
    const { client, writes } = fakeClient(() => []);

    await deleteAllKeys(client, TABLE, keys(60), noSleep);

    expect(writes.map((batch) => batch.length)).toEqual([25, 25, 10]);
  });

  it("rejoue les suppressions refusées jusqu'à les voir passer", async () => {
    // Premier appel : les trois dernières sont refusées. Le rejeu les passe.
    const { client, writes } = fakeClient((call, batch) => (call === 1 ? batch.slice(-3) : []));

    await deleteAllKeys(client, TABLE, keys(10), noSleep);

    expect(writes).toHaveLength(2);
    expect(writes[1]).toHaveLength(3);
  });

  it("lève plutôt que d'annoncer un faux succès si les refus persistent", async () => {
    const { client } = fakeClient((_, batch) => batch.slice(0, 2));

    await expect(deleteAllKeys(client, TABLE, keys(5), noSleep)).rejects.toThrow(
      /2 suppression\(s\) toujours refusée\(s\)/,
    );
  });

  it("recule de façon exponentielle entre les rejeux", async () => {
    const sleep = vi.fn<Sleep>(async () => {});
    const { client } = fakeClient((call, batch) => (call <= 3 ? batch.slice(0, 1) : []));

    await deleteAllKeys(client, TABLE, keys(1), sleep);

    expect(sleep.mock.calls.map(([delay]) => delay)).toEqual([50, 100, 200]);
  });

  it("ne fait aucun appel sans clé", async () => {
    const { client, writes } = fakeClient(() => []);

    await deleteAllKeys(client, TABLE, [], noSleep);

    expect(writes).toHaveLength(0);
  });
});

describe("queryAllKeys", () => {
  it("suit LastEvaluatedKey jusqu'à la dernière page", async () => {
    const pages = [
      { Items: [{ PK: "U", SK: "A" }], LastEvaluatedKey: { PK: "U", SK: "A" } },
      { Items: [{ PK: "U", SK: "B" }], LastEvaluatedKey: { PK: "U", SK: "B" } },
      { Items: [{ PK: "U", SK: "C" }] },
    ];
    const starts: unknown[] = [];

    const client = {
      send: vi.fn(async (command: QueryCommand) => {
        starts.push(command.input.ExclusiveStartKey);
        return pages[starts.length - 1];
      }),
    } as unknown as BatchClient;

    const result = await queryAllKeys(client, {
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": "U" },
    });

    expect(result.map((key) => key.SK)).toEqual(["A", "B", "C"]);
    expect(starts).toEqual([undefined, { PK: "U", SK: "A" }, { PK: "U", SK: "B" }]);
  });
});
