"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/cn";
import { toggleWishlistAction } from "@/server/actions/wishlist";

/**
 * Bouton favori (P6.6, P8.7).
 *
 * Présent sur la carte produit, sur la fiche produit et sur la page wishlist.
 * Il appelle une **bascule** : le composant n'a pas à savoir dans quel sens
 * aller, et deux clics rapprochés ne créent pas deux entrées.
 *
 * L'état affiché est optimiste, mais la vérité reste serveur. En cas d'échec,
 * `useOptimistic` rend automatiquement l'état d'origine à la fin de la
 * transition : il n'y a pas de retour arrière à écrire, seulement un message
 * à afficher.
 *
 * L'état initial est lu en base par la page qui rend ce bouton, jamais deviné
 * localement, sans quoi le cœur serait vide au rechargement sur un produit
 * pourtant en favori.
 */
export function WishlistButton({
  productId,
  productTitle,
  initialInWishlist = false,
  className,
}: {
  productId: string;
  productTitle: string;
  initialInWishlist?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [inWishlist, setOptimistic] = useOptimistic(initialInWishlist);

  function toggle() {
    startTransition(async () => {
      setOptimistic(!inWishlist);
      const result = await toggleWishlistAction({ productId });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(
        result.data.inWishlist
          ? `${productTitle} ajouté aux favoris`
          : `${productTitle} retiré des favoris`,
      );
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      // Le libellé dit l'action à venir, pas l'état courant : c'est ce
      // qu'attend quelqu'un qui navigue au lecteur d'écran.
      aria-label={
        inWishlist ? `Retirer ${productTitle} des favoris` : `Ajouter ${productTitle} aux favoris`
      }
      aria-pressed={inWishlist}
      className={cn(
        "bg-surface-1/90 border-line-subtle grid size-9 place-items-center rounded-full border",
        "ease-snap backdrop-blur-sm transition-[color,transform] duration-(--duration-fast)",
        "hover:scale-105 active:scale-95",
        "disabled:pointer-events-none disabled:opacity-60",
        inWishlist ? "text-peak" : "text-ink-muted hover:text-ink-strong",
        className,
      )}
    >
      <HeartIcon filled={inWishlist} />
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[18px]"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20.5 4.2 12.9a4.8 4.8 0 0 1 0-6.8 4.8 4.8 0 0 1 6.8 0l1 1 1-1a4.8 4.8 0 0 1 6.8 0 4.8 4.8 0 0 1 0 6.8Z" />
    </svg>
  );
}
