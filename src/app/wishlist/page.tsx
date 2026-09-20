import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState, ProductGridSkeleton } from "@/components/feedback/states";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { WishlistGrid } from "@/components/wishlist/wishlist-grid";
import { wishlistService } from "@/server/services";
import { getSessionUserId } from "@/server/session";

export const metadata: Metadata = {
  title: "Favoris",
  robots: { index: false, follow: false },
};

/**
 * Page liste de souhaits (P8.6).
 *
 * Une entrée dont le produit a quitté le catalogue n'apparaît pas : le service
 * l'écarte. Contrairement au panier, il n'y a ni montant en jeu ni total à
 * expliquer, donc rien à signaler à l'utilisateur.
 */
export default function WishlistPage() {
  return (
    <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-6 px-4 py-8 md:px-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Favoris" }]} />

      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Favoris</h1>
      </header>

      <Suspense fallback={<ProductGridSkeleton count={3} />}>
        <WishlistContent />
      </Suspense>
    </div>
  );
}

async function WishlistContent() {
  const userId = await getSessionUserId();
  const entries = await wishlistService.list(userId);

  return (
    <>
      {entries.length === 0 ? (
        <EmptyState
          title="Aucun favori pour l'instant."
          description="Le cœur sur une fiche produit met l'article de côté, même s'il est en rupture."
          action={{ label: "Parcourir le catalogue", href: "/products" }}
        />
      ) : (
        <WishlistGrid entries={entries} />
      )}
    </>
  );
}
