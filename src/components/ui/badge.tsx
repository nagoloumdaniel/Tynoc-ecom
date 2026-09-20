import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";
import type { Availability } from "@/schemas/product";

/**
 * Badge (P6.2).
 *
 * Les variantes reprennent la signalétique posée en P1 : `jade` veut dire
 * disponible, `signal` veut dire attention, `peak` veut dire limite atteinte.
 * Une quatrième couleur inventée ici casserait la convention que le reste du
 * site enseigne au visiteur.
 */
const badge = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface-2 text-ink-muted",
        available: "bg-jade-soft text-jade-ink",
        attention: "bg-signal-soft text-signal-ink",
        limit: "bg-peak-soft text-peak-ink",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badge>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

const AVAILABILITY_LABELS: Record<Availability, string> = {
  "in-stock": "En stock",
  "low-stock": "Bientôt épuisé",
  "out-of-stock": "Rupture de stock",
};

const AVAILABILITY_TONES: Record<Availability, NonNullable<BadgeProps["tone"]>> = {
  "in-stock": "available",
  "low-stock": "attention",
  "out-of-stock": "limit",
};

/**
 * Badge de disponibilité.
 *
 * Le libellé accompagne toujours la couleur : une pastille verte seule ne dit
 * rien à qui ne distingue pas le vert du rouge, et la couleur ne doit jamais
 * porter l'information à elle seule.
 *
 * Le stock exact n'apparaît que lorsqu'il est bas, parce que c'est le seul
 * moment où il change une décision d'achat.
 */
export function AvailabilityBadge({
  availability,
  stock,
}: {
  availability: Availability;
  stock?: number;
}) {
  const label =
    availability === "low-stock" && typeof stock === "number"
      ? `Plus que ${stock} ${stock > 1 ? "exemplaires" : "exemplaire"}`
      : AVAILABILITY_LABELS[availability];

  return (
    <Badge tone={AVAILABILITY_TONES[availability]}>
      {availability === "in-stock" ? (
        <span className="bg-jade size-1.5 rounded-full" aria-hidden />
      ) : null}
      {label}
    </Badge>
  );
}
