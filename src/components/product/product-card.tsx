import Image from "next/image";
import Link from "next/link";

import { AvailabilityBadge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/cn";
import { availabilityOf, type Product } from "@/schemas/product";

import { WishlistButton } from "./wishlist-button";

/**
 * Carte produit (P6.6).
 *
 * Trois exigences tenues par la structure elle-même.
 *
 * **Hauteur stable.** L'image occupe un carré fixe et le titre est borné à
 * deux lignes. Sans cela, une grille mélangeant des titres d'une et de trois
 * lignes produit des cartes de hauteurs différentes et un décalage à chaque
 * chargement d'image.
 *
 * **Une seule zone cliquable pour naviguer.** Le lien couvre la carte par un
 * pseudo-élément plutôt que d'envelopper tout le contenu : cela évite
 * d'imbriquer le bouton favori dans un lien, ce qui serait invalide et
 * inutilisable au clavier.
 *
 * **Le prix ne danse pas.** Chiffres tabulaires, hérités du socle.
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const availability = availabilityOf(product.stock);
  const cover = product.images[0];

  return (
    <article className="group relative flex flex-col gap-3">
      <div className="bg-surface-2 border-line-subtle relative aspect-square overflow-hidden rounded-lg border">
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt}
            fill
            // `sizes` évite de servir une image pleine largeur pour une
            // vignette de grille : sans lui, le navigateur suppose 100vw.
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            // Seule la première rangée est prioritaire : tout marquer comme
            // prioritaire revient à ne rien prioriser.
            priority={priority}
            className={cn(
              "ease-settle object-cover transition-transform duration-(--duration-slow)",
              "group-hover:scale-[1.03]",
              availability === "out-of-stock" && "opacity-60",
            )}
          />
        ) : null}

        {/* Au-dessus de la surcouche de lien, qui recouvre sinon le bouton.
            Empilement local à la carte, sans rapport avec les couches
            globales (en-tête, tiroir, dialogue) qui ont leurs tokens. */}
        <div className="absolute top-2 right-2 z-10">
          <WishlistButton productId={product.id} productTitle={product.title} />
        </div>

        {availability !== "in-stock" ? (
          <div className="absolute bottom-2 left-2">
            <AvailabilityBadge availability={availability} stock={product.stock} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-ink-muted text-xs">{product.brand}</p>

        <h3 className="text-ink-strong text-sm leading-snug font-medium">
          <Link
            href={`/products/${product.slug}`}
            // Étend la zone de clic à toute la carte sans envelopper le bouton
            // favori, qui reste au-dessus grâce à son propre empilement.
            className="after:absolute after:inset-0 after:content-['']"
          >
            <span className="line-clamp-2">{product.title}</span>
          </Link>
        </h3>

        <p className="text-ink-strong mt-0.5 text-sm font-semibold">
          {formatPrice(product.priceCents)}
        </p>
      </div>
    </article>
  );
}
