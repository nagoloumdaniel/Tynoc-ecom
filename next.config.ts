import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
