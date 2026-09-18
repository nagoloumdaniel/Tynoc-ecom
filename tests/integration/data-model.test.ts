import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { documentClient, TABLE_NAME } from "@/lib/dynamodb";
import {
  CART_SK_PREFIX,
  CATEGORY_COLLECTION_PK,
  CATEGORY_SK_PREFIX,
  GSI1_NAME,
  GSI2_NAME,
  PRODUCTS_PARTITION,
  WISHLIST_SK_PREFIX,
  cartItemKey,
  categoryListingPrefix,
  productKey,
  userKey,
  wishlistItemKey,
} from "@/lib/keys";
import { productIdFromSlug } from "@/lib/ids";

/**
 * Vérification du modèle de données (P2.2).
 *
 * Le critère d'acceptation de la phase est que **chaque pattern d'accès se
 * résolve par une `Query` ou un `GetItem`, jamais par un `Scan`**. Un critère
 * écrit dans un document ne prouve rien : ce fichier l'exécute.
 *
 * Prérequis : `npm run db:up`, `npm run db:create-table`, `npm run db:seed`.
 * Lancé par `npm run test:integration`, jamais par `npm test`.
 */

const USER_ID = "00000000-0000-4000-8000-0000000000aa";
const SEEDED_SLUG = "sennheiser-hd-660s2";
const SEEDED_ID = productIdFromSlug(SEEDED_SLUG);
const OTHER_ID = productIdFromSlug("hifiman-sundara");

const userPartition = userKey(USER_ID).PK;

beforeAll(async () => {
  const nowIso = new Date().toISOString();
  const expiresAt = Math.floor(Date.now() / 1000) + 3_600;

  await documentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...userKey(USER_ID),
        entityType: "USER",
        id: USER_ID,
        createdAt: nowIso,
        lastSeenAt: nowIso,
        expiresAt,
      },
    }),
  );
  await documentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...cartItemKey(USER_ID, SEEDED_ID),
        entityType: "CART_ITEM",
        productId: SEEDED_ID,
        quantity: 2,
        addedAt: nowIso,
        updatedAt: nowIso,
        expiresAt,
      },
    }),
  );
  await documentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...wishlistItemKey(USER_ID, OTHER_ID),
        entityType: "WISHLIST_ITEM",
        productId: OTHER_ID,
        addedAt: nowIso,
        expiresAt,
      },
    }),
  );
});

afterAll(async () => {
  for (const key of [
    userKey(USER_ID),
    cartItemKey(USER_ID, SEEDED_ID),
    wishlistItemKey(USER_ID, OTHER_ID),
  ]) {
    await documentClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: key }));
  }
});

describe("catalogue", () => {
  it("A1 : lit un produit par identifiant en un GetItem", async () => {
    const { Item } = await documentClient.send(
      new GetCommand({ TableName: TABLE_NAME, Key: productKey(SEEDED_ID) }),
    );

    expect(Item?.["slug"]).toBe(SEEDED_SLUG);
    expect(Item?.["priceCents"]).toBe(54_900);
  });

  it("A2 : résout un slug d'URL par GSI2", async () => {
    const { Items } = await documentClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI2_NAME,
        KeyConditionExpression: "GSI2PK = :pk",
        ExpressionAttributeValues: { ":pk": `SLUG#${SEEDED_SLUG}` },
      }),
    );

    expect(Items).toHaveLength(1);
    expect(Items?.[0]?.["id"]).toBe(SEEDED_ID);
  });

  it("A3 : liste une catégorie déjà triée par prix croissant", async () => {
    const { Items } = await documentClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI1_NAME,
        KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": PRODUCTS_PARTITION,
          ":prefix": categoryListingPrefix("casques"),
        },
      }),
    );

    const prices = (Items ?? []).map((item) => item["priceCents"] as number);
    expect(prices.length).toBeGreaterThan(5);
    // Le tri vient de l'index, pas d'un tri applicatif.
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(new Set((Items ?? []).map((item) => item["categorySlug"]))).toEqual(
      new Set(["casques"]),
    );
  });

  it("A3 bis : le tri décroissant ne coûte qu'un drapeau", async () => {
    const { Items } = await documentClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI1_NAME,
        KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": PRODUCTS_PARTITION,
          ":prefix": categoryListingPrefix("casques"),
        },
        ScanIndexForward: false,
      }),
    );

    const prices = (Items ?? []).map((item) => item["priceCents"] as number);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  it("A4 : lit tout le catalogue par une seule Query", async () => {
    const { Items } = await documentClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI1_NAME,
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": PRODUCTS_PARTITION },
      }),
    );

    expect(Items).toHaveLength(47);
  });

  it("A5 : liste les catégories par begins_with sur la clé de tri", async () => {
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

    expect(Items).toHaveLength(8);
  });

  it("A10 : les produits associés sortent de A3 moins le produit courant", async () => {
    const { Items } = await documentClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI1_NAME,
        KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": PRODUCTS_PARTITION,
          ":prefix": categoryListingPrefix("casques"),
        },
      }),
    );

    const related = (Items ?? []).filter((item) => item["id"] !== SEEDED_ID).slice(0, 4);
    expect(related).toHaveLength(4);
    expect(related.some((item) => item["id"] === SEEDED_ID)).toBe(false);
  });

  it("le préfixe de catégorie n'attrape pas une catégorie au nom plus long", async () => {
    // Garde-fou : si un jour "casques-sans-fil" existe, il ne doit pas
    // apparaître dans "casques".
    const { Items } = await documentClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI1_NAME,
        KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": PRODUCTS_PARTITION,
          ":prefix": categoryListingPrefix("cable"),
        },
      }),
    );

    expect(Items).toHaveLength(0);
  });
});

describe("partition utilisateur", () => {
  it("A6 : lit le panier par begins_with sur la partition de l'utilisateur", async () => {
    const { Items } = await documentClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": userPartition, ":prefix": CART_SK_PREFIX },
      }),
    );

    expect(Items).toHaveLength(1);
    expect(Items?.[0]?.["quantity"]).toBe(2);
  });

  it("A7 : lit la liste de souhaits sans ramener le panier", async () => {
    const { Items } = await documentClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": userPartition, ":prefix": WISHLIST_SK_PREFIX },
      }),
    );

    expect(Items).toHaveLength(1);
    expect(Items?.[0]?.["productId"]).toBe(OTHER_ID);
  });

  it("A8 : réécrire la même ligne de panier ne crée pas de doublon", async () => {
    const nowIso = new Date().toISOString();
    await documentClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...cartItemKey(USER_ID, SEEDED_ID),
          entityType: "CART_ITEM",
          productId: SEEDED_ID,
          quantity: 5,
          addedAt: nowIso,
          updatedAt: nowIso,
        },
      }),
    );

    const { Items } = await documentClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": userPartition, ":prefix": CART_SK_PREFIX },
      }),
    );

    // L'unicité vient de la clé, pas d'une vérification applicative.
    expect(Items).toHaveLength(1);
    expect(Items?.[0]?.["quantity"]).toBe(5);
  });

  it("A9 : un ajout conditionnel refuse un doublon de liste de souhaits", async () => {
    const attempt = documentClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...wishlistItemKey(USER_ID, OTHER_ID),
          entityType: "WISHLIST_ITEM",
          productId: OTHER_ID,
          addedAt: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );

    // Le nom de l'exception, pas son message : c'est `name` que le repository
    // traduira en erreur applicative de doublon (P3.7).
    await expect(attempt).rejects.toMatchObject({ name: "ConditionalCheckFailedException" });
  });

  it("A11 : lit le profil en un GetItem", async () => {
    const { Item } = await documentClient.send(
      new GetCommand({ TableName: TABLE_NAME, Key: userKey(USER_ID) }),
    );

    expect(Item?.["id"]).toBe(USER_ID);
    expect(Item?.["expiresAt"]).toBeTypeOf("number");
  });

  it("une seule Query ramène profil, panier et wishlist de l'utilisateur", async () => {
    // C'est l'intérêt de tout ranger sous la même partition : la page panier
    // n'a pas besoin de trois allers-retours.
    const { Items } = await documentClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": userPartition },
      }),
    );

    const types = new Set((Items ?? []).map((item) => item["entityType"]));
    expect(types).toEqual(new Set(["USER", "CART_ITEM", "WISHLIST_ITEM"]));
  });
});
