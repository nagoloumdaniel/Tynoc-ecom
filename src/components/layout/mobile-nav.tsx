"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Category } from "@/schemas/category";

/**
 * Navigation mobile (P6.5).
 *
 * Le tiroir repose sur le `<dialog>` natif, qui apporte le piège de focus,
 * Échap et l'inertie de l'arrière-plan sans code de notre part.
 *
 * Restait une chose que la plateforme ne fait pas : **fermer au changement de
 * route**. Une navigation côté client ne démonte pas le tiroir, qui resterait
 * ouvert par-dessus la page d'arrivée.
 */
export function MobileNav({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  // Ajustement pendant le rendu plutôt qu'effet : fermer dans un `useEffect`
  // laisserait le tiroir visible le temps d'un rendu supplémentaire, soit
  // exactement le scintillement qu'on cherche à éviter.
  //
  // Comparer le chemin couvre toutes les causes de navigation, y compris le
  // bouton « retour » du navigateur, ce qu'un `onClick` sur chaque lien ne
  // ferait pas.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
          />
        </svg>
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Menu" placement="drawer">
        <div className="flex h-full flex-col">
          <div className="border-line-subtle flex items-center justify-between border-b px-5 py-4">
            <span className="text-ink-strong text-base font-semibold font-stretch-90%">Tynoc</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fermer le menu"
              onClick={() => setOpen(false)}
            >
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                />
              </svg>
            </Button>
          </div>

          <nav aria-label="Catégories" className="flex-1 overflow-y-auto px-2 py-3">
            <ul className="flex flex-col">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="text-ink hover:bg-surface-2 hover:text-ink-strong block rounded-md px-3 py-2.5 text-sm"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-line-subtle border-t px-2 py-3">
            <Link
              href="/products"
              className="text-ink hover:bg-surface-2 hover:text-ink-strong block rounded-md px-3 py-2.5 text-sm"
            >
              Tout le catalogue
            </Link>
          </div>
        </div>
      </Dialog>
    </>
  );
}
