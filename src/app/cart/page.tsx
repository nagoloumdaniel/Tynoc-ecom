import type { Metadata } from "next";

import { CartLines } from "@/components/cart/cart-lines";
import { OrphanLines } from "@/components/cart/orphan-lines";
import { EmptyState } from "@/components/feedback/states";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { formatPrice } from "@/lib/cn";
import { cartService } from "@/server/services";
import { getSessionUserId } from "@/server/session";

export const metadata: Metadata = {
  title: "Panier",
  // Un panier est propre à une session : rien à indexer, et surtout rien à
  // laisser apparaître dans un moteur de recherche.
  robots: { index: false, follow: false },
};

/**
 * Page panier (P8.1, P8.4).
 *
 * Server Component : **le total est calculé côté serveur**, à partir du prix
 * courant de chaque produit, et arrive déjà fait dans le rendu. Aucun calcul
 * de montant ne vit dans le navigateur, où il pourrait diverger ou être
 * bricolé.
 *
 * Seules les lignes sont clientes, parce qu'elles portent des actions.
 */
export default async function CartPage() {
  const userId = await getSessionUserId();
  const summary = await cartService.getSummary(userId);

  const empty = summary.lines.length === 0 && summary.orphanProductIds.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-6 px-4 py-8 md:px-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Panier" }]} />

      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Panier</h1>
        {summary.itemCount > 0 ? (
          <p className="text-ink-muted text-sm tabular-nums">
            {summary.itemCount} {summary.itemCount > 1 ? "articles" : "article"}
          </p>
        ) : null}
      </header>

      {empty ? (
        <EmptyState
          title="Votre panier est vide."
          description="Parcourez le catalogue pour y ajouter un premier article."
          action={{ label: "Parcourir le catalogue", href: "/products" }}
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
          <div className="flex flex-col gap-4">
            <OrphanLines productIds={summary.orphanProductIds} />
            {summary.lines.length > 0 ? <CartLines lines={summary.lines} /> : null}
          </div>

          <Card className="flex flex-col gap-4 p-5 lg:sticky lg:top-24">
            <h2 className="text-ink-strong text-base font-semibold">Récapitulatif</h2>

            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Sous-total</dt>
                <dd className="text-ink-strong font-medium tabular-nums">
                  {formatPrice(summary.subtotalCents)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Livraison</dt>
                <dd className="text-ink-muted">Calculée à la commande</dd>
              </div>
            </dl>

            <div className="border-line-subtle flex justify-between gap-4 border-t pt-4">
              <span className="text-ink-strong text-sm font-medium">Total</span>
              <span className="text-ink-strong text-lg font-semibold tabular-nums">
                {formatPrice(summary.subtotalCents)}
              </span>
            </div>

            {/* Le paiement est hors périmètre, décidé en P1.1. Le dire est plus
                honnête qu'un bouton « Commander » qui ne mène nulle part. */}
            <p className="text-ink-muted text-xs">
              Ce projet de démonstration s&apos;arrête au panier : aucune commande ne peut être
              passée.
            </p>

            <ButtonLink href="/products" variant="outline" block>
              Continuer mes achats
            </ButtonLink>
          </Card>
        </div>
      )}
    </div>
  );
}
