"use client";

import Image from "next/image";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { AvailabilityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/cn";
import type { WishlistEntry } from "@/schemas/wishlist";
import { moveToCartAction, removeFromWishlistAction } from "@/server/actions/wishlist";

/**
 * Grille de la liste de souhaits (P8.6).
 *
 * « Déplacer vers le panier » est une seule action côté serveur, et l'ordre y
 * est garanti : ajout au panier d'abord, retrait de la liste ensuite. Si le
 * produit est tombé en rupture, l'ajout échoue et l'entrée **reste** dans la
 * liste. Dans l'ordre inverse, le produit disparaîtrait de la liste sans
 * jamais arriver dans le panier.
 *
 * Le retrait optimiste est réservé au retrait simple. Le déplacement, lui,
 * attend la réponse : il peut légitimement échouer, et faire disparaître la
 * carte avant de savoir serait mentir à l'utilisateur.
 */
export function WishlistGrid({ entries }: { entries: WishlistEntry[] }) {
  const [pending, startTransition] = useTransition();
  const [visible, removeOptimistically] = useOptimistic(entries, (current, productId: string) =>
    current.filter((entry) => entry.product.id !== productId),
  );

  function remove(entry: WishlistEntry) {
    startTransition(async () => {
      removeOptimistically(entry.product.id);
      const result = await removeFromWishlistAction({ productId: entry.product.id });

      if (!result.success) toast.error(result.error.message);
    });
  }

  function move(entry: WishlistEntry) {
    startTransition(async () => {
      const result = await moveToCartAction({ productId: entry.product.id });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(`${entry.product.title} déplacé vers le panier`, {
        action: { label: "Voir le panier", onClick: () => (window.location.href = "/cart") },
      });
    });
  }

  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3",
        pending && "opacity-90",
      )}
    >
      {visible.map((entry) => {
        const soldOut = entry.availability === "out-of-stock";

        return (
          <li
            key={entry.product.id}
            className="animate-enter border-line-subtle flex flex-col overflow-hidden rounded-lg border"
          >
            <Link
              href={`/products/${entry.product.slug}`}
              className="bg-surface-2 relative aspect-square"
            >
              {entry.product.images[0] ? (
                <Image
                  src={entry.product.images[0].url}
                  alt={entry.product.images[0].alt}
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                  className={cn("object-cover", soldOut && "opacity-60")}
                />
              ) : null}
            </Link>

            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex flex-col gap-1">
                <p className="text-ink-muted text-xs">{entry.product.brand}</p>
                <Link
                  href={`/products/${entry.product.slug}`}
                  className="text-ink-strong hover:text-ink line-clamp-2 text-sm font-medium"
                >
                  {entry.product.title}
                </Link>
                <p className="text-ink-strong text-sm font-semibold tabular-nums">
                  {formatPrice(entry.product.priceCents)}
                </p>
              </div>

              <AvailabilityBadge availability={entry.availability} stock={entry.product.stock} />

              <div className="mt-auto flex flex-wrap gap-2">
                <Button size="sm" onClick={() => move(entry)} disabled={soldOut || pending}>
                  {soldOut ? "Indisponible" : "Déplacer vers le panier"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(entry)}>
                  Retirer
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
