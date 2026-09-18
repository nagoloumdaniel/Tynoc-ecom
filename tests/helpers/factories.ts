import { productIdFromSlug } from "@/lib/ids";
import type { Category } from "@/schemas/category";
import type { Product } from "@/schemas/product";

/**
 * Fabriques d'entités pour les tests de services.
 *
 * Un test de logique métier doit parler de ce qu'il vérifie, pas répéter
 * quinze champs obligatoires. Ces fabriques fournissent un produit valide par
 * défaut, et le test ne surcharge que ce qui compte pour lui.
 */

let counter = 0;

export function makeProduct(overrides: Partial<Product> = {}): Product {
  counter += 1;
  const slug = overrides.slug ?? `produit-de-test-${counter}`;
  const now = "2026-09-18T10:00:00.000Z";

  return {
    id: productIdFromSlug(slug),
    slug,
    title: `Produit ${counter}`,
    brand: "Marque",
    summary: "Une phrase de résumé.",
    description: "Une description de fiche produit.",
    priceCents: 1_999,
    stock: 10,
    categorySlug: "casques",
    tags: [],
    images: [{ url: "https://picsum.photos/seed/test/1200/1200", alt: "Visuel" }],
    specs: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeCategory(overrides: Partial<Category> = {}): Category {
  const slug = overrides.slug ?? "casques";
  const now = "2026-09-18T10:00:00.000Z";

  return {
    slug,
    name: "Casques",
    description: "Casques ouverts et fermés.",
    position: 1,
    image: { url: "https://picsum.photos/seed/cat/1200/1200", alt: "Casques" },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
