import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/feedback/states";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ProductGrid } from "@/components/product/product-grid";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/json-ld";
import { getCategories, getCategory, searchCatalogue } from "@/server/catalogue";

/**
 * Page catégorie (P7.5).
 *
 * `generateStaticParams` déclare les huit slugs connus, ce qui permet à Next
 * de préparer ces routes au build plutôt qu'à la première visite. Le catalogue
 * est figé par le seed : la liste est donc exacte et n'a pas à être devinée.
 *
 * Le tri et les filtres fins restent sur `/products`, avec un lien depuis
 * ici. Dupliquer la barre de filtres sur deux pages reviendrait à maintenir
 * deux fois la même logique d'URL.
 */
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

async function loadCategory(slug: string) {
  return (await getCategory(slug)) ?? notFound();
}

export async function generateMetadata({
  params,
}: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;

  try {
    const category = await getCategory(slug);
    if (!category) return { title: "Catégorie introuvable" };

    return { title: category.name, description: category.description };
  } catch {
    return { title: "Catégorie introuvable" };
  }
}

export default async function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const category = await loadCategory(slug);

  const result = await searchCatalogue({ category: slug, sort: "price-asc", pageSize: 48 });

  return (
    <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-6 px-4 py-8 md:px-6">
      <ItemListJsonLd products={result.items} />
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "Catégories", path: "/categories" },
          { name: category.name, path: `/categories/${category.slug}` },
        ]}
      />

      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Catégories", href: "/categories" },
          { label: category.name },
        ]}
      />

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{category.name}</h1>
        <p className="text-ink-muted max-w-[62ch] text-sm">{category.description}</p>
        <p className="text-ink-faint text-xs tabular-nums">
          {result.total} {result.total > 1 ? "produits" : "produit"}
        </p>
      </header>

      {result.items.length === 0 ? (
        <EmptyState
          title="Cette catégorie est vide pour le moment."
          description="Aucun produit n'y est rattaché. Le reste du catalogue est disponible."
          action={{ label: "Voir tout le catalogue", href: "/products" }}
        />
      ) : (
        <ProductGrid products={result.items} />
      )}
    </div>
  );
}
