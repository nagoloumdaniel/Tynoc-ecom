import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ProductCard } from "@/components/product/product-card";
import { BreadcrumbJsonLd, ProductJsonLd } from "@/components/seo/json-ld";
import { ProductGallery } from "@/components/product/product-gallery";
import { WishlistButton } from "@/components/product/wishlist-button";
import { AvailabilityBadge, Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/surface";
import { isAppError } from "@/lib/errors";
import { formatPrice } from "@/lib/cn";
import { availabilityOf } from "@/schemas/product";
import { getCategory, getProduct, getRelatedProducts } from "@/server/catalogue";

/**
 * Fiche produit (P7.6, P7.7).
 *
 * Un slug inconnu appelle `notFound()`, qui rend la page 404 globale. Le
 * service lève un `NotFoundError` ; c'est ici, à la frontière du rendu, qu'il
 * devient un 404 HTTP, et pas plus bas. Le même produit absent vaut une ligne
 * orpheline dans le panier, pas un 404 : la même absence n'a pas la même
 * conséquence selon l'appelant.
 */

async function loadProduct(slug: string) {
  try {
    return await getProduct(slug);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await getProduct(slug);

    return {
      title: `${product.brand} ${product.title}`,
      description: product.summary,
      openGraph: {
        title: `${product.brand} ${product.title}`,
        description: product.summary,
        images: product.images[0] ? [{ url: product.images[0].url }] : [],
      },
    };
  } catch {
    // Les métadonnées ne doivent jamais faire échouer le rendu : la page
    // elle-même décidera du 404.
    return { title: "Produit introuvable" };
  }
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await loadProduct(slug);

  const [category, related] = await Promise.all([
    getCategory(product.categorySlug).catch(() => null),
    getRelatedProducts(product),
  ]);

  const availability = availabilityOf(product.stock);
  const soldOut = availability === "out-of-stock";

  return (
    <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-14 px-4 py-8 md:px-6">
      <ProductJsonLd product={product} availability={availability} />
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "Catalogue", path: "/products" },
          ...(category ? [{ name: category.name, path: `/categories/${category.slug}` }] : []),
          { name: product.title, path: `/products/${product.slug}` },
        ]}
      />

      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Catalogue", href: "/products" },
          ...(category ? [{ label: category.name, href: `/categories/${category.slug}` }] : []),
          { label: product.title },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={product.images} title={product.title} />

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-ink-muted text-sm">{product.brand}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{product.title}</h1>
            <p className="text-ink-muted text-base">{product.summary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-ink-strong text-2xl font-semibold">
              {formatPrice(product.priceCents)}
            </span>
            <AvailabilityBadge availability={availability} stock={product.stock} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AddToCartButton
              productId={product.id}
              size="lg"
              disabled={soldOut}
              // Le libellé dit ce qui se passera, y compris quand rien ne peut
              // se passer : « Indisponible » est plus utile qu'un bouton grisé
              // qui garde son texte d'origine.
            >
              {soldOut ? "Indisponible" : "Ajouter au panier"}
            </AddToCartButton>

            <WishlistButton
              productId={product.id}
              productTitle={product.title}
              className="size-12"
            />
          </div>

          {soldOut ? (
            <p className="text-ink-muted text-sm">
              Ce produit n&apos;est pas disponible pour le moment. Ajoutez-le à vos favoris pour le
              retrouver facilement.
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            <h2 className="text-ink-strong text-sm font-medium">Description</h2>
            <p className="text-ink max-w-[62ch] text-sm leading-relaxed">{product.description}</p>
          </div>

          {product.specs.length > 0 ? (
            <Card tone="sunken" className="overflow-hidden">
              <h2 className="text-ink-strong border-line-subtle border-b px-4 py-3 text-sm font-medium">
                Caractéristiques
              </h2>
              <dl className="divide-line-subtle divide-y">
                {product.specs.map((spec) => (
                  <div key={spec.label} className="grid grid-cols-2 gap-4 px-4 py-2.5 text-sm">
                    <dt className="text-ink-muted">{spec.label}</dt>
                    <dd className="text-ink-strong tabular-nums">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}

          {product.tags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="flex flex-col gap-5">
          <h2 className="text-2xl font-semibold tracking-tight">Dans la même famille</h2>

          <ul className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4">
            {related.map((item) => (
              <li key={item.id}>
                <ProductCard product={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
