import Image from "next/image";
import Link from "next/link";

import { ProductGrid } from "@/components/product/product-grid";
import { ButtonLink } from "@/components/ui/button";
import { productService } from "@/server/services";
import { getWishlistProductIds } from "@/server/storefront";

/**
 * Accueil (P7.2).
 *
 * Server Component, alimenté par la base. Trois blocs, dans l'ordre dans
 * lequel un visiteur les utilise : ce que vend le magasin, par où entrer, et
 * ce qui est arrivé récemment.
 *
 * Le hero ouvre sur du texte plutôt que sur une photographie pleine page. Le
 * magasin vend de la précision, et une promesse écrite dit plus qu'une image
 * de casque sur fond dégradé, qui est par ailleurs le hero de tous les sites
 * concurrents.
 */
export default async function HomePage() {
  const [categories, newest, wishlistIds] = await Promise.all([
    productService.listCategories(),
    productService.search({ sort: "newest", pageSize: 8 }),
    getWishlistProductIds(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-20 px-4 py-12 md:px-6 md:py-16">
      <section className="flex flex-col gap-6">
        <h1 className="max-w-[18ch] text-5xl leading-[0.98] font-semibold tracking-tighter font-stretch-90%">
          Choisis pour leurs mesures autant que pour leur écoute.
        </h1>

        <p className="text-ink-muted max-w-[58ch] text-lg">
          Casques, enceintes, convertisseurs et microphones. Chaque fiche porte les caractéristiques
          qui décident vraiment de l&apos;achat, pas des adjectifs.
        </p>

        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/products" size="lg">
            Parcourir le catalogue
          </ButtonLink>
          <ButtonLink href="/categories" variant="outline" size="lg">
            Voir les catégories
          </ButtonLink>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">Par famille</h2>
          <Link
            href="/categories"
            className="text-ink-muted hover:text-ink-strong text-sm transition-colors duration-(--duration-instant)"
          >
            Tout voir
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.slice(0, 8).map((category) => (
            <li key={category.slug}>
              <Link
                href={`/categories/${category.slug}`}
                className="group border-line-subtle hover:border-line-strong relative block overflow-hidden rounded-lg border transition-colors duration-(--duration-instant)"
              >
                <div className="bg-surface-2 relative aspect-4/3">
                  <Image
                    src={category.image.url}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 22vw, 45vw"
                    className="ease-settle object-cover transition-transform duration-(--duration-slow) group-hover:scale-[1.04]"
                  />
                </div>

                <div className="flex items-baseline justify-between gap-2 px-3 py-2.5">
                  <span className="text-ink-strong text-sm font-medium">{category.name}</span>
                  <span className="text-ink-faint text-xs tabular-nums">
                    {category.productCount}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">Derniers arrivés</h2>
          <Link
            href="/products?sort=newest"
            className="text-ink-muted hover:text-ink-strong text-sm transition-colors duration-(--duration-instant)"
          >
            Tout voir
          </Link>
        </div>

        <ProductGrid products={newest.items} wishlistIds={wishlistIds} />
      </section>

      <section className="border-line-subtle grid gap-8 border-t pt-10 sm:grid-cols-3">
        {[
          {
            title: "Des chiffres, pas des adjectifs",
            body: "Impédance, réponse en fréquence, distorsion : les caractéristiques sont sur la fiche, pas dans une notice à télécharger.",
          },
          {
            title: "Stock réel",
            body: "La disponibilité affichée est celle de l'entrepôt. Un produit en rupture le dit avant l'ajout au panier, pas après.",
          },
          {
            title: "Retour sous 30 jours",
            body: "Un casque s'évalue sur plusieurs jours d'écoute, pas en trois minutes en magasin.",
          },
        ].map((item) => (
          <div key={item.title} className="flex flex-col gap-2">
            <h3 className="text-ink-strong text-sm font-medium">{item.title}</h3>
            <p className="text-ink-muted text-sm">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
