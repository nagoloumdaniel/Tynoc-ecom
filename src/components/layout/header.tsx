import Link from "next/link";
import { Suspense } from "react";

import { cn } from "@/lib/cn";
import type { Category } from "@/schemas/category";

import { MobileNav } from "./mobile-nav";
import { SearchBar } from "./search-bar";

/**
 * En-tête du site (P6.4).
 *
 * Server Component. Seuls le tiroir mobile, le champ de recherche et les
 * compteurs sont clients : c'est la règle du `"use client"` le plus bas
 * possible dans l'arbre.
 *
 * Les compteurs sont rendus par le serveur à chaque navigation. Une Server
 * Action qui modifie le panier provoque un nouveau rendu de la route courante,
 * dont l'en-tête fait partie : le compteur se met donc à jour sans état client
 * ni invalidation globale.
 */
export function Header({
  categories,
  cartCount,
  wishlistCount,
}: {
  categories: Category[];
  cartCount: number;
  wishlistCount: number;
}) {
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
        <MobileNav categories={categories} />

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
            count={wishlistCount}
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
            count={cartCount}
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
  count: number;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      // Le libellé porte le nombre : une pastille seule n'est pas annoncée.
      aria-label={count > 0 ? `${label}, ${count} article${count > 1 ? "s" : ""}` : label}
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

      {count > 0 ? (
        <span
          aria-hidden
          className="bg-signal text-ink-strong absolute top-1 right-1 grid min-w-4 place-items-center rounded-full px-1 text-[10px] leading-4 font-semibold tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
