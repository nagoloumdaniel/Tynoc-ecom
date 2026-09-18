import { z } from "zod";

import { isoDateSchema, slugSchema } from "./common";

/**
 * Catégorie (P2.3).
 *
 * Le slug est l'identité de la catégorie : il sert de clé de tri, d'URL et de
 * lien depuis le produit. Il n'y a donc pas d'identifiant technique séparé,
 * qui n'apporterait rien et qu'il faudrait résoudre à chaque affichage.
 */
export const categorySchema = z.strictObject({
  slug: slugSchema,
  name: z.string().min(1).max(60),
  description: z.string().min(1).max(500),

  /**
   * Ordre d'affichage voulu par le marchand, indépendant de l'alphabet.
   * Le tri se fait en mémoire : la vitrine compte moins de dix catégories,
   * et un index dédié pour trier huit éléments serait disproportionné.
   */
  position: z.int().min(0).max(999),

  image: z.strictObject({
    url: z.url(),
    alt: z.string().min(1).max(200),
  }),

  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export type Category = z.infer<typeof categorySchema>;

/** Catégorie enrichie du nombre de produits, pour les pages d'index. */
export interface CategoryWithCount extends Category {
  productCount: number;
}
