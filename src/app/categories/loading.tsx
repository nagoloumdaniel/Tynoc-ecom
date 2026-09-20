import { Skeleton } from "@/components/ui/surface";

/** Chargement de l'index des catégories (P9.1). */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-6 px-4 py-8 md:px-6">
      <Skeleton className="h-3 w-40" />

      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-3 w-64" />
      </div>

      <ul
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        role="status"
        aria-label="Chargement des catégories"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index} className="border-line-subtle overflow-hidden rounded-lg border">
            <Skeleton className="aspect-16/9 w-full rounded-none" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
