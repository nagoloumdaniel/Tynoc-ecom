import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { productService } from "@/server/services";

export const metadata: Metadata = {
  title: "Catégories",
  description: "Les huit familles de produits du catalogue Tynoc.",
};

/**
 * Index des catégories (P7.5).
 *
 * Chaque vignette annonce le nombre de produits : une catégorie vide se voit
 * avant le clic, plutôt qu'après, sur une page sans résultat.
 */
export default async function CategoriesPage() {
  const categories = await productService.listCategories();

  return (
    <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-6 px-4 py-8 md:px-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Catégories" }]} />

      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Catégories</h1>
        <p className="text-ink-muted text-sm">
          Huit familles, de l&apos;écouteur intra au moniteur de studio.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/categories/${category.slug}`}
              className="group border-line-subtle hover:border-line-strong block overflow-hidden rounded-lg border transition-colors duration-(--duration-instant)"
            >
              <div className="bg-surface-2 relative aspect-16/9">
                <Image
                  src={category.image.url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                  className="ease-settle object-cover transition-transform duration-(--duration-slow) group-hover:scale-[1.03]"
                />
              </div>

              <div className="flex flex-col gap-1.5 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-ink-strong text-base font-medium">{category.name}</h2>
                  <span className="text-ink-faint text-xs tabular-nums">
                    {category.productCount} {category.productCount > 1 ? "produits" : "produit"}
                  </span>
                </div>
                <p className="text-ink-muted line-clamp-2 text-sm">{category.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
