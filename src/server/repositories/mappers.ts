import type { ZodType } from "zod";

import { DatabaseError } from "@/lib/errors";
import { cartItemSchema, type CartItem } from "@/schemas/cart";
import { categorySchema, type Category } from "@/schemas/category";
import { productSchema, type Product } from "@/schemas/product";
import { userSchema, type User } from "@/schemas/user";
import { wishlistItemSchema, type WishlistItem } from "@/schemas/wishlist";

/**
 * Traduction item DynamoDB vers entité du domaine (P3.6).
 *
 * Leur raison d'être tient en une phrase : **au-dessus du repository, plus
 * personne ne sait que `PK` existe**. Un objet qui traverse la frontière en
 * portant encore `GSI1SK` finira par être utilisé tel quel quelque part, et la
 * couche de données aura fui dans l'interface.
 *
 * Le filtrage est une liste blanche et non une liste noire : on garde les
 * champs du schéma plutôt que de retirer les clés connues. Une liste noire
 * laisse passer le prochain attribut technique que l'on ajoutera.
 */

/** Attributs de stockage, jamais présents dans une entité du domaine. */
const STORAGE_ATTRIBUTES = [
  "PK",
  "SK",
  "GSI1PK",
  "GSI1SK",
  "GSI2PK",
  "GSI2SK",
  "entityType",
  "expiresAt",
] as const;

type RawItem = Record<string, unknown>;

/**
 * Valide un item stocké contre son schéma.
 *
 * Un item qui ne correspond plus à son schéma est une **corruption de base**,
 * pas une faute de l'utilisateur : d'où `DatabaseError`, qui porte un 500 et
 * refuse d'exposer son message. Le détail du champ fautif reste dans
 * `message`, donc dans les logs serveur, et n'atteint jamais le client.
 */
function parseOrFail<T>(schema: ZodType<T>, item: RawItem, entity: string): T {
  const result = schema.safeParse(item);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(racine)"} : ${issue.message}`)
      .join(" ; ");

    throw new DatabaseError(`Item ${entity} corrompu en base : ${details}`, {
      cause: result.error,
    });
  }

  return result.data;
}

/** Retire les attributs de stockage avant validation par un schéma strict. */
function stripStorageAttributes(item: RawItem): RawItem {
  const cleaned: RawItem = { ...item };

  for (const attribute of STORAGE_ATTRIBUTES) {
    delete cleaned[attribute];
  }

  return cleaned;
}

export function toProduct(item: RawItem): Product {
  return parseOrFail(productSchema, stripStorageAttributes(item), "produit");
}

export function toCategory(item: RawItem): Category {
  return parseOrFail(categorySchema, stripStorageAttributes(item), "catégorie");
}

export function toUser(item: RawItem): User {
  return parseOrFail(userSchema, stripStorageAttributes(item), "utilisateur");
}

export function toCartItem(item: RawItem): CartItem {
  return parseOrFail(cartItemSchema, stripStorageAttributes(item), "ligne de panier");
}

export function toWishlistItem(item: RawItem): WishlistItem {
  return parseOrFail(wishlistItemSchema, stripStorageAttributes(item), "entrée de wishlist");
}
