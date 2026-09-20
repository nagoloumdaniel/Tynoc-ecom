import { CartSkeleton } from "@/components/feedback/states";
import { Skeleton } from "@/components/ui/surface";

/** Chargement du panier (P9.1). */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-6 px-4 py-8 md:px-6">
      <Skeleton className="h-3 w-36" />

      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <CartSkeleton count={3} />

        <div className="border-line-subtle flex flex-col gap-4 rounded-lg border p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  );
}
