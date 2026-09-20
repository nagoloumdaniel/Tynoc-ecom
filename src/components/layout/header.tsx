import Link from "next/link";
import { Suspense } from "react";

import { cn } from "@/lib/cn";
import type { Category } from "@/schemas/category";

import { CartCount, WishlistCount } from "./header-counters";
import { MobileNav } from "./mobile-nav";
import { SearchBar } from "./search-bar";

/**
 * En-tête du site (P6.4).
 *
 * Server Component. Seuls le tiroir mobile et le champ de recherche sont des
 * composants clients, parce qu'ils ont besoin d'état : c'est la règle du
 * marqueur client le plus bas possible dans l'arbre.
 *
 * Les compteurs, eux, restent des composants serveur. Ils n'ont pas d'état,
 * seulement une dépendance à la requête, et ils arrivent en flux.
 *
 * Les catégories sont mises en cache, donc l'en-tête entre dans la coquille
 * statique. Seuls les compteurs dépendent de la session : ils sont rendus
 * derrière leur propre frontière Suspense et arrivent en flux (P10.1).
 *
 * Une Server Action qui modifie le panier provoque un nouveau rendu de la
 * route courante, dont l'en-tête fait partie : le compteur se met donc à jour
 * sans état client ni invalidation globale.
 */
export function Header({ categories }: { categories: Category[] }) {
  return (
    <header className="bg-surface-1/85 border-line-subtle sticky top-0 z-[var(--z-header)] border-b backdrop-blur">
      {/* Premier élément focalisable de la page : permet d'atteindre le
          contenu sans traverser toute la navigation au clavier. */}
      <a
        href="#contenu"
        className="bg-action text-on-action sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2 focus:text-sm"
      >
        Aller au contenu
      </a>

      <div className="mx-auto flex w-full max-w-(--container-page) items-center gap-3 px-4 py-3 md:px-6 lg:gap-6">
        {/* `usePathname` n'a de valeur qu'à l'exécution et empêcherait le
            prérendu de l'en-tête. Le repli reprend exactement le gabarit du
            bouton, donc aucun décalage de mise en page quand le tiroir
            arrive. */}
        <Suspense fallback={<div className="size-10 lg:hidden" />}>
          <MobileNav categories={categories} />
        </Suspense>

        <Link
          href="/"
          className="text-ink-strong text-lg font-semibold tracking-tighter font-stretch-90%"
        >
          Tynoc
        </Link>

        <nav aria-label="Catégories" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {categories.slice(0, 6).map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="text-ink-muted hover:text-ink-strong hover:bg-surface-2 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-(--duration-instant)"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* `useSearchParams` impose une frontière Suspense, sinon toute la
            route bascule en rendu dynamique. */}
        <Suspense fallback={<div className="h-10 flex-1" />}>
          <SearchBar className="ml-auto hidden max-w-xs flex-1 md:block" />
        </Suspense>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <CounterLink
            href="/wishlist"
            label="Favoris"
            count={
              <Suspense fallback={null}>
                <WishlistCount />
              </Suspense>
            }
            icon={
              <path
                d="M12 20.5 4.2 12.9a4.8 4.8 0 0 1 0-6.8 4.8 4.8 0 0 1 6.8 0l1 1 1-1a4.8 4.8 0 0 1 6.8 0 4.8 4.8 0 0 1 0 6.8Z"
                strokeLinejoin="round"
              />
            }
          />
          <CounterLink
            href="/cart"
            label="Panier"
            count={
              <Suspense fallback={null}>
                <CartCount />
              </Suspense>
            }
            icon={
              <>
                <path
                  d="M3 5h2l2.2 9.3a2 2 0 0 0 2 1.5h6.9a2 2 0 0 0 2-1.5L20 8H6"
                  strokeLinejoin="round"
                />
                <circle cx="10" cy="19" r="1.2" />
                <circle cx="17" cy="19" r="1.2" />
              </>
            }
          />
        </div>
      </div>
    </header>
  );
}

function CounterLink({
  href,
  label,
  count,
  icon,
}: {
  href: string;
  label: string;
  /** Rendu en flux : le nombre n'est pas connu au moment du prérendu. */
  count: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "text-ink-strong hover:bg-surface-2 relative grid size-10 place-items-center rounded-md",
        "transition-colors duration-(--duration-instant)",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        aria-hidden
      >
        {icon}
      </svg>

      {/* La pastille porte le nombre pour les lecteurs d'écran : le libellé du
          lien ne peut plus le contenir, puisqu'il est rendu au prérendu alors
          que le compteur arrive plus tard. */}
      <span className="animate-count bg-signal text-ink-strong absolute top-1 right-1 grid min-w-4 place-items-center rounded-full px-1 text-[10px] leading-4 font-semibold tabular-nums empty:hidden">
        {count}
      </span>
    </Link>
  );
}
