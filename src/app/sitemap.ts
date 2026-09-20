import type { MetadataRoute } from "next";

import { env } from "@/lib/env";
import { getCategories, searchCatalogue } from "@/server/catalogue";

/**
 * Plan du site (P10.6).
 *
 * Généré depuis la base, jamais tenu à la main : une liste écrite en dur
 * diverge du catalogue au premier produit ajouté, et rien ne le signale.
 *
 * Seules les pages publiques y figurent. Le panier, les favoris et la page de
 * données personnelles sont propres à une session : les proposer à
 * l'indexation n'aurait aucun sens, et ils portent déjà `noindex`.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  const [categories, catalogue] = await Promise.all([
    getCategories(),
    searchCatalogue({ pageSize: 48 }),
  ]);

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/categories`, changeFrequency: "monthly", priority: 0.7 },

    ...categories.map((category) => ({
      url: `${base}/categories/${category.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),

    ...catalogue.items.map((product) => ({
      url: `${base}/products/${product.slug}`,
      // La date de dernière modification vient de l'entité, pas de l'heure de
      // génération : annoncer « modifié maintenant » à chaque build apprend
      // aux moteurs à ignorer le champ.
      lastModified: new Date(product.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
