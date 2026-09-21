import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * Politique de sécurité du contenu (P12.3).
 *
 * **Sans nonce, délibérément.** La documentation de Next 16 est explicite :
 * un nonce se génère par requête, donc il impose le rendu dynamique de chaque
 * page. Ce serait défaire le prérendu obtenu en P10.1, où toutes les routes
 * servent une coquille statique. Next documente pour ce cas une politique sans
 * nonce, reprise ici.
 *
 * Ce qu'elle concède : `'unsafe-inline'` sur les scripts, parce que le rendu en
 * flux de React injecte des scripts en ligne. Ce qu'elle garde, et qui compte :
 * aucune origine tierce pour les scripts, styles, images, polices ou appels
 * réseau ; aucun `<object>` ; `base-uri` et `form-action` verrouillés, ce qui
 * neutralise deux détournements classiques d'une injection HTML ; et
 * `frame-ancestors 'none'`, qui interdit d'encadrer le site pour du
 * détournement de clic.
 *
 * Pas de `upgrade-insecure-requests` : il casserait le serveur de test local
 * en `http`, et HSTS couvre déjà la production, servie en HTTPS.
 */
function contentSecurityPolicy(isDev: boolean): string {
  return [
    "default-src 'self'",
    // `'unsafe-eval'` en développement seulement : le rafraîchissement à chaud
    // de React l'exige, le build de production non.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // Les images distantes passent par `/_next/image`, donc restent `'self'`.
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

function securityHeaders(isDev: boolean) {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(isDev) },
    // Le navigateur n'interprète pas un fichier autrement que selon son type
    // déclaré : pas de JSON exécuté comme script.
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Doublon ancien de `frame-ancestors`, pour les navigateurs qui ignorent
    // encore la CSP sur ce point.
    { key: "X-Frame-Options", value: "DENY" },
    // L'adresse complète, requête de recherche comprise, ne part pas vers un
    // site tiers ; seule l'origine l'accompagne.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Une boutique n'a besoin ni de caméra, ni de micro, ni de position.
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    // Ignoré par les navigateurs sur une réponse `http` : sans effet en local,
    // et actif dès la mise en ligne en HTTPS. Pas de `preload`, qui engage le
    // domaine pour des mois auprès des navigateurs.
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ];
}

const baseConfig: NextConfig = {
  // L'en-tête `X-Powered-By: Next.js` n'apporte rien au visiteur et renseigne
  // gratuitement quiconque cherche une version vulnérable.
  poweredByHeader: false,

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

/**
 * Configuration en fonction de la phase, plutôt qu'en lisant
 * `process.env.NODE_ENV` : le projet réserve la lecture brute de
 * l'environnement à `src/lib/env.ts`, et Next fournit la phase lui-même.
 */
export default function nextConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    ...baseConfig,
    async headers() {
      return [{ source: "/(.*)", headers: securityHeaders(isDev) }];
    },
  };
}
