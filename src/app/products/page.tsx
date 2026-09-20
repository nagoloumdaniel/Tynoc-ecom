import type { Metadata } from "next";

import { EmptyState } from "@/components/feedback/states";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FilterBar } from "@/components/product/filter-bar";
import { Pagination } from "@/components/product/pagination";
import { ProductGrid } from "@/components/product/product-grid";
import { ButtonLink } from "@/components/ui/button";
import { DEFAULT_PAGE_SIZE } from "@/lib/limits";
import { storefrontQuerySchema } from "@/schemas/api";
import { getCategories, searchCatalogue } from "@/server/catalogue";

/**
 * Listing et résultats de recherche (P7.3, P7.4).
 *
 * Une seule page pour les deux : une recherche n'est qu'un listing avec un
 * filtre de plus. Deux pages distinctes obligeraient à dupliquer les filtres,
 * le tri et la pagination, et à les maintenir en parallèle.
 *
 * **Tout l'état vit dans l'URL.** Aucun état React ne porte les filtres : une
 * sélection est donc partageable, rechargeable, et le bouton « retour » du
 * navigateur fonctionne sans code.
 *
 * Les paramètres invalides ne cassent rien. Le schéma les ramène à l'absence
 * plutôt qu'à une erreur : `?page=abc` affiche la première page, il ne montre
 * pas un écran d'erreur à quelqu'un qui a simplement mal copié une adresse.
 */
export const metadata: Metadata = {
  title: "Catalogue",
  description: "Casques, enceintes, convertisseurs, amplificateurs et microphones.",
};

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const query = storefrontQuerySchema.parse(await searchParams);

  const [result, categories] = await Promise.all([
    searchCatalogue({
      ...(query.q === undefined ? {} : { q: query.q }),
      ...(query.category === undefined ? {} : { category: query.category }),
      // Les prix de l'URL sont en euros, ceux du domaine en centimes.
      ...(query.minPrice === undefined ? {} : { minPriceCents: Math.round(query.minPrice * 100) }),
      ...(query.maxPrice === undefined ? {} : { maxPriceCents: Math.round(query.maxPrice * 100) }),
      ...(query.inStock === undefined ? {} : { inStockOnly: true }),
      ...(query.sort === undefined ? {} : { sort: query.sort }),
      page: query.page ?? 1,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
    getCategories(),
  ]);

  const searching = Boolean(query.q);

  return (
    <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-6 px-4 py-8 md:px-6">
      <Breadcrumb
        items={[{ label: "Accueil", href: "/" }, { label: searching ? "Recherche" : "Catalogue" }]}
      />

      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {searching ? `Résultats pour « ${query.q} »` : "Catalogue"}
        </h1>
        <p className="text-ink-muted text-sm tabular-nums">
          {result.total} {result.total > 1 ? "produits" : "produit"}
        </p>
      </header>

      <FilterBar categories={categories} query={query} />

      {result.items.length === 0 ? (
        <NoResults query={query.q} />
      ) : (
        <>
          <ProductGrid products={result.items} />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            buildHref={(page) => buildHref(query, page)}
          />
        </>
      )}
    </div>
  );
}

/**
 * Résultat vide.
 *
 * Il propose une sortie concrète plutôt qu'un constat : relâcher les filtres,
 * ou repartir du catalogue complet. Un écran vide sans issue est un cul-de-sac.
 */
function NoResults({ query }: { query: string | undefined }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <EmptyState
        title={query ? `Aucun résultat pour « ${query} ».` : "Aucun produit ne correspond."}
        description="Essayez avec moins de filtres, ou un terme plus général comme « casque », « micro » ou « câble »."
        action={{ label: "Voir tout le catalogue", href: "/products" }}
        className="w-full"
      />

      <div className="flex flex-wrap justify-center gap-2">
        {["casques", "ecouteurs", "microphones", "cables"].map((slug) => (
          <ButtonLink key={slug} href={`/categories/${slug}`} variant="outline" size="sm">
            {slug}
          </ButtonLink>
        ))}
      </div>
    </div>
  );
}

/** Conserve les filtres en cours quand on change de page. */
function buildHref(query: Record<string, unknown>, page: number): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (key === "page" || value === undefined) continue;
    params.set(key, String(value));
  }

  if (page > 1) params.set("page", String(page));

  const search = params.toString();
  return search.length > 0 ? `/products?${search}` : "/products";
}
