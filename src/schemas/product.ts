import { z } from "zod";

import {
  isoDateSchema,
  priceCentsSchema,
  productIdSchema,
  slugSchema,
  stockSchema,
} from "./common";

/**
 * Produit (P2.3).
 *
 * Le catalogue Tynoc vend du matériel d'écoute : le ton est factuel et les
 * caractéristiques sont des données, pas du texte marketing noyé dans la
 * description. D'où `specs`, qui alimente un tableau et reste comparable.
 */

export const productImageSchema = z.strictObject({
  url: z.url(),
  /**
   * Texte alternatif obligatoire. Une image produit sans alt est une image
   * invisible pour un lecteur d'écran, et le brief exige l'accessibilité.
   */
  alt: z.string().min(1).max(200),
});

export const productSpecSchema = z.strictObject({
  label: z.string().min(1).max(60),
  value: z.string().min(1).max(120),
});

export const productSchema = z.strictObject({
  id: productIdSchema,
  slug: slugSchema,
  title: z.string().min(1).max(120),
  brand: z.string().min(1).max(60),

  /** Une phrase, affichée sur la carte produit. */
  summary: z.string().min(1).max(200),
  /** Texte long de la fiche produit. */
  description: z.string().min(1).max(4_000),

  priceCents: priceCentsSchema,
  stock: stockSchema,

  categorySlug: slugSchema,
  /**
   * Mots-clés exploités à la fois par la recherche et par les filtres
   * (`ouvert`, `fermé`, `sans-fil`, `studio`, `nomade`, `haute-impedance`).
   */
  tags: z.array(slugSchema).max(12),

  images: z.array(productImageSchema).min(1).max(8),
  specs: z.array(productSpecSchema).max(20),

  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export type Product = z.infer<typeof productSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
export type ProductSpec = z.infer<typeof productSpecSchema>;

/** Tris exposés par le listing. Fermé : un tri inconnu ne doit rien casser. */
export const productSortSchema = z.enum(["newest", "price-asc", "price-desc", "name"]);
export type ProductSort = z.infer<typeof productSortSchema>;

/**
 * Disponibilité dérivée du stock, jamais stockée en base : une valeur calculée
 * et persistée finit toujours par diverger de la valeur qui la produit.
 */
export const availabilitySchema = z.enum(["in-stock", "low-stock", "out-of-stock"]);
export type Availability = z.infer<typeof availabilitySchema>;

/** Seuil à partir duquel un produit est signalé comme bientôt épuisé. */
export const LOW_STOCK_THRESHOLD = 5;

export function availabilityOf(stock: number): Availability {
  if (stock <= 0) return "out-of-stock";
  if (stock <= LOW_STOCK_THRESHOLD) return "low-stock";
  return "in-stock";
}
