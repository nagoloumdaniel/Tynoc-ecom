import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Cache Components, et donc Partial Prerendering (P10.1).
   *
   * Sans lui, la lecture du cookie de session dans la mise en page bascule
   * **toutes** les routes en rendu dynamique, y compris les pages catégorie
   * dont les paramètres sont pourtant connus au build. Le
   * `generateStaticParams` écrit en P7 était de ce fait inerte, ce que la
   * sortie de build montrait noir sur blanc.
   *
   * Avec lui, la coquille est prérendue et seules les parties qui dépendent
   * réellement de la requête, les compteurs et le panier, restent différées
   * derrière leur frontière Suspense.
   */
  cacheComponents: true,

  images: {
    /**
     * AVIF avant WebP (P10.2). Next sert le premier format accepté par le
     * navigateur : AVIF pèse en général 20 à 30 % de moins que WebP à qualité
     * comparable, et les navigateurs trop anciens retombent d'eux-mêmes sur
     * le format d'origine.
     */
    formats: ["image/avif", "image/webp"],

    /**
     * Liste blanche stricte des hôtes d'images distantes (anticipe P15.11).
     *
     * `next/image` optimise à la demande les URL qu'on lui donne : laissé
     * ouvert avec `hostname: "**"`, il devient un proxy de récupération
     * d'URL arbitraires, c'est-à-dire une SSRF ouverte sur le serveur. La
     * restriction est posée dès le premier usage d'image, pas dix phases
     * plus tard.
     *
     * `picsum.photos` sert les photographies de substitution du seed. Il
     * disparaîtra quand les vraies photographies produit arriveront.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/seed/**",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
