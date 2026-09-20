import { ProductGridSkeleton } from "@/components/feedback/states";
import { Skeleton } from "@/components/ui/surface";

/**
 * Chargement du listing (P9.1).
 *
 * Le squelette reprend la géométrie exacte de la page finale : même en-tête,
 * même barre de filtres, même grille. Un squelette approximatif produit un
 * saut de mise en page au moment du remplacement, ce qui est plus désagréable
 * que pas de squelette du tout.
 *
 * Aucun spinner plein écran : il n'indique que « quelque chose se passe »,
 * là où une silhouette annonce déjà ce qui arrive et où.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-6 px-4 py-8 md:px-6">
      <Skeleton className="h-3 w-40" />

      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-3 w-24" />
      </div>

      <div className="border-line-subtle flex flex-wrap items-end gap-3 border-b pb-5">
        {[28, 24, 24, 32, 36].map((width, index) => (
          <div key={index} className="flex flex-col gap-1">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-8" style={{ width: `${width * 4}px` }} />
          </div>
        ))}
      </div>

      <ProductGridSkeleton count={12} />
    </div>
  );
}
