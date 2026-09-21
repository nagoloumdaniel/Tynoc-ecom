import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

/**
 * Directives d'exploration (P10.6).
 *
 * Les trois espaces liés à la session sont exclus explicitement. Ils portent
 * déjà `noindex` dans leurs métadonnées, mais `robots.txt` évite en plus la
 * dépense d'exploration : un robot qui parcourt `/cart` crée une session à
 * chaque passage, donc un item en base pour rien.
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_SITE_URL;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cart", "/wishlist", "/account", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
