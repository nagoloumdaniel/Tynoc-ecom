import { Skeleton } from "@/components/ui/surface";

/** Chargement de la liste de souhaits (P9.1). */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-6 px-4 py-8 md:px-6">
      <Skeleton className="h-3 w-36" />

      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>

      <ul
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        role="status"
        aria-label="Chargement des favoris"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className="border-line-subtle overflow-hidden rounded-lg border">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
