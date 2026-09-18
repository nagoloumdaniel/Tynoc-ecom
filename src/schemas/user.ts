import { z } from "zod";

import { isoDateSchema, userIdSchema } from "./common";

/**
 * Utilisateur (P2.3).
 *
 * Le brief demande la « gestion des données utilisateur », pas une
 * authentification. L'identité est donc une session anonyme persistante :
 * un UUID tiré côté serveur, déposé dans un cookie httpOnly signé, et
 * matérialisé en base à la première visite.
 *
 * Deux règles portées par ce schéma :
 *
 * - **Minimisation** (RGPD art. 5.1.c, P16.6) : aucun champ « au cas où ».
 *   Pas d'adresse IP, pas d'e-mail, pas d'empreinte de navigateur.
 * - **Identité dérivée du serveur** (P15.1) : `id` ne vient jamais d'une
 *   entrée client. Un `userId` reçu dans un corps de requête est ignoré.
 */
export const userSchema = z.strictObject({
  id: userIdSchema,

  /** Nom d'affichage optionnel, seule donnée que l'utilisateur peut saisir. */
  displayName: z.string().min(1).max(60).optional(),

  createdAt: isoDateSchema,
  /** Rafraîchi à chaque interaction ; sert aussi de base au calcul du TTL. */
  lastSeenAt: isoDateSchema,
});

export type User = z.infer<typeof userSchema>;

/** Seul champ modifiable par l'utilisateur (droit de rectification, art. 16). */
export const userProfileUpdateSchema = z.strictObject({
  displayName: z.string().trim().min(1).max(60),
});

export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
