import Link from "next/link";
import { Suspense } from "react";

import { SearchBar } from "@/components/layout/search-bar";
import { ButtonLink } from "@/components/ui/button";
import { getCategories } from "@/server/catalogue";

/**
 * Page 404 globale (P7.9).
 *
 * Exigence explicite du brief, traitée comme une page à part entière plutôt
 * que comme un message d'excuse. Quelqu'un arrive ici parce qu'un lien est
 * mort ou qu'une adresse a été mal recopiée : ce qui l'aide, c'est un champ de
 * recherche et des points d'entrée, pas un grand « 404 » centré.
 *
 * Le ton reste celui du magasin : factuel, sans excuse ni humour forcé.
 */
export default async function NotFound() {
  // Une 404 ne doit jamais échouer à son tour. Si la base est injoignable, la
  // page s'affiche sans les raccourcis plutôt que de renvoyer une erreur 500.
  const categories = await getCategories().catch(() => []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-4 py-24 text-center md:px-6">
      <div className="flex flex-col gap-3">
        <p className="text-ink-faint text-sm font-medium tabular-nums">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">Cette page n&apos;existe pas.</h1>
        <p className="text-ink-muted max-w-[52ch] text-sm">
          Le lien est peut-être périmé, ou le produit a quitté le catalogue. Cherchez directement ce
          que vous vouliez voir.
        </p>
      </div>

      <Suspense fallback={<div className="h-10 w-full max-w-sm" />}>
        <SearchBar className="w-full max-w-sm" />
      </Suspense>

      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/products">Parcourir le catalogue</ButtonLink>
        <ButtonLink href="/" variant="outline">
          Retour à l&apos;accueil
        </ButtonLink>
      </div>

      {categories.length > 0 ? (
        <nav aria-label="Catégories" className="flex flex-col gap-3">
          <h2 className="text-ink-muted text-xs">Ou par famille de produits</h2>
          <ul className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="border-line-subtle text-ink hover:border-line-strong hover:text-ink-strong rounded-md border px-3 py-1.5 text-sm transition-colors duration-(--duration-instant)"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
