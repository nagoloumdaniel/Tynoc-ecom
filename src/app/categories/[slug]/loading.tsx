import { ProductGridSkeleton } from "@/components/feedback/states";
import { Skeleton } from "@/components/ui/surface";

/** Chargement d'une page catégorie (P9.1). */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-6 px-4 py-8 md:px-6">
      <Skeleton className="h-3 w-56" />

      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-3 w-full max-w-lg" />
        <Skeleton className="h-2.5 w-20" />
      </div>

      <ProductGridSkeleton count={8} />
    </div>
  );
}
