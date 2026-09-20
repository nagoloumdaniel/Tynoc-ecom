import { Skeleton } from "@/components/ui/surface";

/** Chargement de la fiche produit (P9.1). */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-14 px-4 py-8 md:px-6">
      <Skeleton className="h-3 w-64" />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="flex flex-col gap-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="size-16 rounded-md" />
            <Skeleton className="size-16 rounded-md" />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>

          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-5 w-24 rounded-sm" />
          </div>

          <div className="flex gap-3">
            <Skeleton className="h-12 w-48 rounded-md" />
            <Skeleton className="size-12 rounded-full" />
          </div>

          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
