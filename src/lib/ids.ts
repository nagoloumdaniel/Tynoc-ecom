import { createHash } from "node:crypto";

/**
 * Fabrique d'identifiants de produit.
 *
 * L'identifiant est **dérivé du slug**, et non tiré au hasard. C'est ce qui
 * rend le seed idempotent : relancer `npm run db:seed` réécrit les mêmes
 * items au lieu d'empiler des doublons sous de nouveaux identifiants.
 *
 * Il reste malgré tout opaque, donc distinct du slug. Les deux chemins
 * d'accès du modèle gardent leur raison d'être : par identifiant (A1, clé
 * primaire) et par slug (A2, index GSI2).
 *
 * Seuls les scripts d'alimentation s'en servent : l'application ne crée
 * jamais de produit.
 */
export function productIdFromSlug(slug: string): string {
  const digest = createHash("sha256").update(slug).digest("hex").slice(0, 12);
  return `prd_${digest}`;
}
