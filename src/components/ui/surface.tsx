import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * Carte et squelette (P6.2).
 *
 * L'élévation suit la règle posée en P1 : en clair par une ombre, en sombre
 * par la luminosité de la surface. Les deux tiennent dans le même token, donc
 * un composant n'a jamais à savoir dans quel thème il est rendu.
 */
const card = cva("rounded-lg border transition-colors duration-(--duration-instant)", {
  variants: {
    tone: {
      /** Carte posée sur la page. */
      raised: "bg-surface-1 border-line-subtle shadow-xs",
      /** Zone creuse, pour un encart d'information. */
      sunken: "bg-surface-2 border-transparent",
      /** Contour seul, sans fond. */
      outline: "border-line bg-transparent",
    },
    interactive: {
      // Réservé aux cartes réellement cliquables : un survol qui change tout
      // ce qu'il touche finit par ne plus rien signaler.
      true: "hover:border-line-strong hover:shadow-sm",
      false: "",
    },
  },
  defaultVariants: { tone: "raised", interactive: false },
});

export type CardProps = ComponentProps<"div"> & VariantProps<typeof card>;

export function Card({ className, tone, interactive, ...props }: CardProps) {
  return <div className={cn(card({ tone, interactive }), className)} {...props} />;
}

/**
 * Squelette de chargement.
 *
 * Il n'annonce rien aux technologies d'assistance : le contenu réel arrive
 * juste après, et faire lire « chargement » sur chaque rectangle d'une grille
 * de douze produits produit douze annonces inutiles. C'est la région qui
 * porte l'état, pas chaque rectangle.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("bg-surface-2 animate-pulse rounded-md", className)}
      {...props}
    />
  );
}
