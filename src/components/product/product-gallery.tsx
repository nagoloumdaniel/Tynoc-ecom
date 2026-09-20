"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/cn";
import type { ProductImage } from "@/schemas/product";

/**
 * Galerie de la fiche produit (P7.6, reportée de P6.7).
 *
 * Reportée volontairement : une galerie se conçoit avec la fiche qui
 * l'entoure, pas isolée sur une planche de revue.
 *
 * Les vignettes sont de vrais boutons dans un groupe `tablist`. Une galerie
 * bâtie sur des `<div>` cliquables n'est pas atteignable au clavier, et c'est
 * le défaut le plus courant de ce composant.
 *
 * La première image porte `priority` : sur une fiche produit, c'est elle qui
 * décide du LCP.
 */
export function ProductGallery({ images, title }: { images: ProductImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-surface-2 border-line-subtle relative aspect-square overflow-hidden rounded-xl border">
        {current ? (
          <Image
            src={current.url}
            alt={current.alt}
            fill
            sizes="(min-width: 1024px) 45vw, 92vw"
            priority
            className="object-cover"
          />
        ) : null}
      </div>

      {images.length > 1 ? (
        <div role="tablist" aria-label={`Visuels de ${title}`} className="flex gap-2">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={image.alt}
              onClick={() => setActive(index)}
              className={cn(
                "bg-surface-2 relative size-16 overflow-hidden rounded-md border",
                "transition-colors duration-(--duration-instant)",
                index === active
                  ? "border-ink-strong"
                  : "border-line-subtle hover:border-line-strong",
              )}
            >
              <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
