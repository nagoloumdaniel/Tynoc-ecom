import { randomUUID } from "node:crypto";

import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { afterEach, describe, expect, it } from "vitest";

import { documentClient, TABLE_NAME } from "@/lib/dynamodb";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { productIdFromSlug } from "@/lib/ids";
import { MAX_QUANTITY_PER_LINE } from "@/lib/limits";
import { cartRepository } from "@/server/repositories/cart.repository";
import { userRepository } from "@/server/repositories/user.repository";
import { wishlistRepository } from "@/server/repositories/wishlist.repository";

/**
 * Repositories utilisateur (P3.3), panier (P3.4) et liste de souhaits (P3.5),
 * contre DynamoDB Local (P3.9).
 *
 * Chaque test travaille sur son propre identifiant de session et nettoie
 * derrière lui : deux suites qui partagent un utilisateur finiraient par
 * échouer selon leur ordre d'exécution.
 */

const PRODUCT_A = productIdFromSlug("sennheiser-hd-660s2");
const PRODUCT_B = productIdFromSlug("hifiman-sundara");

const createdUsers: string[] = [];

function newUserId(): string {
  const id = randomUUID();
  createdUsers.push(id);
  return id;
}

afterEach(async () => {
  while (createdUsers.length > 0) {
    const id = createdUsers.pop();
    if (id) await userRepository.deleteAll(id);
  }
});

async function rawPartition(userId: string) {
  const { Items } = await documentClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": `USER#${userId}` },
    }),
  );
  return Items ?? [];
}

describe("userRepository", () => {
  it("crée le profil à la première visite", async () => {
    const userId = newUserId();
    const user = await userRepository.findOrCreate(userId);

    expect(user.id).toBe(userId);
    expect(user).not.toHaveProperty("PK");
  });

  it("ne recrée pas un profil existant et conserve sa date de création", async () => {
    const userId = newUserId();
    const first = await userRepository.findOrCreate(userId);
    const second = await userRepository.findOrCreate(userId);

    expect(second.createdAt).toBe(first.createdAt);
  });

  it("dépose une échéance TTL en secondes sur le profil", async () => {
    const userId = newUserId();
    await userRepository.findOrCreate(userId);

    const [item] = await rawPartition(userId);
    const expiresAt = item?.["expiresAt"] as number;

    expect(Number.isInteger(expiresAt)).toBe(true);
    // Des millisecondes placeraient l'échéance en l'an 57 000 : rien ne serait
    // jamais purgé, sans que rien ne le signale.
    expect(expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(expiresAt).toBeLessThan(Math.floor(Date.now() / 1000) + 400 * 24 * 3600);
  });

  it("repousse l'échéance et la dernière visite à chaque passage", async () => {
    const userId = newUserId();
    const created = await userRepository.findOrCreate(userId);

    await new Promise((resolve) => setTimeout(resolve, 10));
    await userRepository.touch(userId);

    const refreshed = await userRepository.findById(userId);
    expect(refreshed?.lastSeenAt).not.toBe(created.lastSeenAt);
  });

  it("met à jour le seul champ que l'utilisateur contrôle", async () => {
    const userId = newUserId();
    await userRepository.findOrCreate(userId);

    const updated = await userRepository.updateProfile(userId, { displayName: "Daniel" });
    expect(updated.displayName).toBe("Daniel");
  });

  it("refuse de modifier un profil inexistant", async () => {
    await expect(
      userRepository.updateProfile(randomUUID(), { displayName: "Fantôme" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("supprime toute la partition, profil, panier et wishlist compris", async () => {
    // Droit à l'effacement (P16.13) : la donnée doit réellement disparaître de
    // la base, pas seulement de l'interface.
    const userId = newUserId();
    await userRepository.findOrCreate(userId);
    await cartRepository.incrementItem(userId, PRODUCT_A, 2, MAX_QUANTITY_PER_LINE);
    await wishlistRepository.add(userId, PRODUCT_B);

    expect(await rawPartition(userId)).toHaveLength(3);

    const deleted = await userRepository.deleteAll(userId);

    expect(deleted).toBe(3);
    expect(await rawPartition(userId)).toHaveLength(0);
  });
});

describe("cartRepository", () => {
  it("crée la ligne au premier ajout", async () => {
    const userId = newUserId();
    const line = await cartRepository.incrementItem(userId, PRODUCT_A, 2, MAX_QUANTITY_PER_LINE);

    expect(line).toMatchObject({ productId: PRODUCT_A, quantity: 2 });
  });

  it("incrémente au lieu de créer un doublon", async () => {
    // L'anti-doublon exigé par le brief vient de la clé : deux ajouts du même
    // produit visent le même item.
    const userId = newUserId();
    await cartRepository.incrementItem(userId, PRODUCT_A, 2, MAX_QUANTITY_PER_LINE);
    const second = await cartRepository.incrementItem(userId, PRODUCT_A, 3, MAX_QUANTITY_PER_LINE);

    expect(second.quantity).toBe(5);
    expect(await cartRepository.list(userId)).toHaveLength(1);
  });

  it("refuse un incrément qui dépasserait le plafond, sans rien modifier", async () => {
    const userId = newUserId();
    await cartRepository.incrementItem(userId, PRODUCT_A, 9, MAX_QUANTITY_PER_LINE);

    await expect(
      cartRepository.incrementItem(userId, PRODUCT_A, 5, MAX_QUANTITY_PER_LINE),
    ).rejects.toBeInstanceOf(ConflictError);

    // Le refus est atomique : la quantité n'a pas bougé d'un demi-pas.
    const lines = await cartRepository.list(userId);
    expect(lines[0]?.quantity).toBe(9);
  });

  it("refuse un premier ajout qui dépasse déjà le plafond", async () => {
    // La condition d'écriture ne suffit pas : sur une ligne inexistante,
    // `attribute_not_exists` est vraie et laisserait créer la ligne hors
    // plafond. Le garde-fou doit exister avant l'appel.
    const userId = newUserId();

    await expect(
      cartRepository.incrementItem(
        userId,
        PRODUCT_A,
        MAX_QUANTITY_PER_LINE + 1,
        MAX_QUANTITY_PER_LINE,
      ),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(await cartRepository.list(userId)).toEqual([]);
  });

  it("refuse un incrément nul ou négatif", async () => {
    // Un incrément de zéro créerait une ligne à quantité nulle, que le mapper
    // rejetterait ensuite comme une corruption de base.
    const userId = newUserId();

    await expect(
      cartRepository.incrementItem(userId, PRODUCT_A, 0, MAX_QUANTITY_PER_LINE),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      cartRepository.incrementItem(userId, PRODUCT_A, -3, MAX_QUANTITY_PER_LINE),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(await cartRepository.list(userId)).toEqual([]);
  });

  it("fixe une quantité absolue", async () => {
    const userId = newUserId();
    await cartRepository.incrementItem(userId, PRODUCT_A, 2, MAX_QUANTITY_PER_LINE);

    const updated = await cartRepository.setQuantity(userId, PRODUCT_A, 7);
    expect(updated.quantity).toBe(7);
  });

  it("refuse de fixer la quantité d'une ligne absente", async () => {
    const userId = newUserId();
    await userRepository.findOrCreate(userId);

    await expect(cartRepository.setQuantity(userId, PRODUCT_A, 3)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("supprime une ligne, et le refaire n'est pas une erreur", async () => {
    const userId = newUserId();
    await cartRepository.incrementItem(userId, PRODUCT_A, 1, MAX_QUANTITY_PER_LINE);

    await cartRepository.removeItem(userId, PRODUCT_A);
    // Idempotent : un double clic ne doit pas produire d'écran d'erreur.
    await expect(cartRepository.removeItem(userId, PRODUCT_A)).resolves.toBeUndefined();
    expect(await cartRepository.list(userId)).toEqual([]);
  });

  it("vide le panier sans toucher au profil ni à la liste de souhaits", async () => {
    const userId = newUserId();
    await userRepository.findOrCreate(userId);
    await cartRepository.incrementItem(userId, PRODUCT_A, 1, MAX_QUANTITY_PER_LINE);
    await cartRepository.incrementItem(userId, PRODUCT_B, 1, MAX_QUANTITY_PER_LINE);
    await wishlistRepository.add(userId, PRODUCT_B);

    await cartRepository.clear(userId);

    expect(await cartRepository.list(userId)).toEqual([]);
    expect(await wishlistRepository.list(userId)).toHaveLength(1);
    expect(await userRepository.findById(userId)).not.toBeNull();
  });

  it("ne mélange pas les paniers de deux sessions", async () => {
    const mine = newUserId();
    const other = newUserId();
    await cartRepository.incrementItem(mine, PRODUCT_A, 1, MAX_QUANTITY_PER_LINE);

    expect(await cartRepository.list(other)).toEqual([]);
  });
});

describe("wishlistRepository", () => {
  it("ajoute une entrée", async () => {
    const userId = newUserId();
    const entry = await wishlistRepository.add(userId, PRODUCT_A);

    expect(entry.productId).toBe(PRODUCT_A);
  });

  it("refuse un doublon au niveau de la base", async () => {
    // Le refus vient de la condition d'écriture, donc sans lecture préalable
    // et sans fenêtre de concurrence entre le test et l'écriture.
    const userId = newUserId();
    await wishlistRepository.add(userId, PRODUCT_A);

    await expect(wishlistRepository.add(userId, PRODUCT_A)).rejects.toBeInstanceOf(ConflictError);
    expect(await wishlistRepository.list(userId)).toHaveLength(1);
  });

  it("répond à la question de présence sans ramener la liste", async () => {
    const userId = newUserId();
    await wishlistRepository.add(userId, PRODUCT_A);

    expect(await wishlistRepository.has(userId, PRODUCT_A)).toBe(true);
    expect(await wishlistRepository.has(userId, PRODUCT_B)).toBe(false);
  });

  it("supprime une entrée, et le refaire n'est pas une erreur", async () => {
    const userId = newUserId();
    await wishlistRepository.add(userId, PRODUCT_A);

    await wishlistRepository.remove(userId, PRODUCT_A);
    await expect(wishlistRepository.remove(userId, PRODUCT_A)).resolves.toBeUndefined();
    expect(await wishlistRepository.list(userId)).toEqual([]);
  });

  it("ne ramène pas les lignes de panier de la même partition", async () => {
    const userId = newUserId();
    await cartRepository.incrementItem(userId, PRODUCT_A, 1, MAX_QUANTITY_PER_LINE);
    await wishlistRepository.add(userId, PRODUCT_B);

    const entries = await wishlistRepository.list(userId);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.productId).toBe(PRODUCT_B);
  });
});
