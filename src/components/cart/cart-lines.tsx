"use client";

import Image from "next/image";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { AvailabilityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/cn";
import type { CartLine } from "@/schemas/cart";
import { addToCartAction, removeFromCartAction } from "@/server/actions/cart";

import { QuantityStepper } from "./quantity-stepper";

/**
 * Lignes du panier (P8.1 à P8.3).
 *
 * Le retrait est **annulable** (P8.3). Rien ne disparaît sans filet : la ligne
 * s'efface immédiatement, et la notification propose de la remettre pendant
 * cinq secondes. L'annulation rappelle simplement l'ajout avec la quantité
 * mémorisée avant le retrait, donc elle passe par le même chemin serveur, avec
 * les mêmes contrôles de stock. Si le produit est tombé en rupture entre-temps,
 * l'annulation échoue et le dit, plutôt que de faire semblant.
 *
 * Le retrait optimiste fait disparaître la ligne avant la réponse du serveur.
 * En cas d'échec, `useOptimistic` la remet de lui-même à la fin de la
 * transition : il n'y a pas de retour arrière à écrire.
 */
export function CartLines({ lines }: { lines: CartLine[] }) {
  const [pending, startTransition] = useTransition();
  const [visible, removeOptimistically] = useOptimistic(lines, (current, productId: string) =>
    current.filter((line) => line.product.id !== productId),
  );

  function remove(line: CartLine) {
    startTransition(async () => {
      removeOptimistically(line.product.id);
      const result = await removeFromCartAction({ productId: line.product.id });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(`${line.product.title} retiré du panier`, {
        action: {
          label: "Annuler",
          onClick: () =>
            startTransition(async () => {
              const undone = await addToCartAction({
                productId: line.product.id,
                quantity: line.quantity,
              });

              if (!undone.success) toast.error(undone.error.message);
            }),
        },
      });
    });
  }

  return (
    <ul className={cn("flex flex-col", pending && "opacity-90")}>
      {visible.map((line) => (
        <li
          key={line.product.id}
          className="animate-enter border-line-subtle flex gap-4 border-b py-5 first:border-t"
        >
          <Link
            href={`/products/${line.product.slug}`}
            className="bg-surface-2 border-line-subtle relative size-24 shrink-0 overflow-hidden rounded-md border"
          >
            {line.product.images[0] ? (
              <Image
                src={line.product.images[0].url}
                alt={line.product.images[0].alt}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : null}
          </Link>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-ink-muted text-xs">{line.product.brand}</p>
                <Link
                  href={`/products/${line.product.slug}`}
                  className="text-ink-strong hover:text-ink truncate text-sm font-medium"
                >
                  {line.product.title}
                </Link>
                <p className="text-ink-muted text-xs tabular-nums">
                  {formatPrice(line.product.priceCents)} l&apos;unité
                </p>
              </div>

              <p className="text-ink-strong shrink-0 text-sm font-semibold tabular-nums">
                {formatPrice(line.lineTotalCents)}
              </p>
            </div>

            {line.exceedsStock || line.availability !== "in-stock" ? (
              <div className="flex flex-wrap items-center gap-2">
                <AvailabilityBadge availability={line.availability} stock={line.product.stock} />
                {line.exceedsStock ? (
                  <span className="text-peak-ink text-xs">
                    Il ne reste que {line.product.stock} en stock.
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="mt-1 flex items-center gap-3">
              <QuantityStepper
                productId={line.product.id}
                quantity={line.quantity}
                max={line.product.stock}
              />

              <Button variant="ghost" size="sm" onClick={() => remove(line)}>
                Retirer
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
