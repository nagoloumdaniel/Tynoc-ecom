import type { ReactNode } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/surface";
import { cn } from "@/lib/cn";

/**
 * États vides, d'erreur et de chargement (P6.9).
 *
 * Génériques et réutilisés partout : la règle du projet est qu'**aucune page
 * n'écrit son état vide en dur**. Sinon la neuvième page en oublie un, ou
 * invente une formulation qui contredit les huit autres.
 *
 * Deux principes de rédaction, hérités de P1.9 : un état vide est une
 * invitation, donc il propose toujours une sortie ; une erreur dit ce qui
 * s'est passé et quoi faire, sans excuse ni formule vague.
 */

export interface EmptyStateProps {
  title: string;
  description: string;
  /** Sortie concrète. Un état vide sans issue est un cul-de-sac. */
  action?: { label: string; href: string };
  /** Illustration ou pictogramme, purement décoratif. */
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <Card
      tone="sunken"
      className={cn("flex flex-col items-center gap-3 px-6 py-14 text-center", className)}
    >
      {icon ? (
        <div className="text-ink-faint" aria-hidden>
          {icon}
        </div>
      ) : null}

      <h2 className="text-ink-strong text-lg font-semibold">{title}</h2>
      <p className="text-ink-muted max-w-[46ch] text-sm">{description}</p>

      {action ? (
        <ButtonLink href={action.href} className="mt-2">
          {action.label}
        </ButtonLink>
      ) : null}
    </Card>
  );
}

export interface ErrorStateProps {
  /** Ce qui s'est passé, en clair. Jamais « une erreur est survenue ». */
  title: string;
  description: string;
  /** Rejoue l'opération. Fourni par une frontière d'erreur React. */
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title, description, onRetry, className }: ErrorStateProps) {
  return (
    <Card
      tone="outline"
      // `role="alert"` : l'erreur est annoncée dès qu'elle apparaît, sans que
      // l'utilisateur ait à la chercher.
      role="alert"
      className={cn(
        "border-peak/40 flex flex-col items-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <h2 className="text-ink-strong text-lg font-semibold">{title}</h2>
      <p className="text-ink-muted max-w-[46ch] text-sm">{description}</p>

      {onRetry ? (
        <Button variant="outline" className="mt-2" onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
    </Card>
  );
}

/**
 * Squelette d'une grille de produits.
 *
 * Il reprend **la géométrie exacte** de la carte finale : même ratio d'image,
 * mêmes hauteurs de lignes de texte. Un squelette approximatif produit un saut
 * de mise en page au moment du remplacement, ce qui est pire que pas de
 * squelette du tout.
 */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      // Une seule annonce pour toute la région, pas une par rectangle.
      role="status"
      aria-label="Chargement des produits"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Squelette des lignes de panier, même principe. */
export function CartSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Chargement du panier">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="border-line-subtle flex gap-4 border-b pb-4">
          <Skeleton className="size-24 shrink-0 rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
