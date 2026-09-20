import Link from "next/link";

import type { Category } from "@/schemas/category";

/**
 * Pied de page (P7.10, construit ici avec le reste de la mise en page).
 *
 * La réassurance reste factuelle, comme le ton du magasin : des faits
 * vérifiables plutôt que des promesses. Rien n'y est inventé pour remplir.
 */
export function Footer({ categories }: { categories: Category[] }) {
  return (
    <footer className="border-line-subtle bg-surface-1 mt-20 border-t">
      <div className="mx-auto w-full max-w-(--container-page) px-4 py-12 md:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <span className="text-ink-strong text-lg font-semibold tracking-tighter font-stretch-90%">
              Tynoc
            </span>
            <p className="text-ink-muted max-w-[34ch] text-sm">
              Matériel d&apos;écoute choisi pour ses mesures autant que pour son écoute.
            </p>
          </div>

          <nav aria-label="Catalogue" className="flex flex-col gap-3">
            <h2 className="text-ink-strong text-sm font-medium">Catalogue</h2>
            <ul className="flex flex-col gap-2">
              {categories.slice(0, 5).map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="text-ink-muted hover:text-ink-strong text-sm transition-colors duration-(--duration-instant)"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Votre espace" className="flex flex-col gap-3">
            <h2 className="text-ink-strong text-sm font-medium">Votre espace</h2>
            <ul className="flex flex-col gap-2">
              <li>
                <Link
                  href="/cart"
                  className="text-ink-muted hover:text-ink-strong text-sm transition-colors duration-(--duration-instant)"
                >
                  Panier
                </Link>
              </li>
              <li>
                <Link
                  href="/wishlist"
                  className="text-ink-muted hover:text-ink-strong text-sm transition-colors duration-(--duration-instant)"
                >
                  Favoris
                </Link>
              </li>
              <li>
                <Link
                  href="/account"
                  className="text-ink-muted hover:text-ink-strong text-sm transition-colors duration-(--duration-instant)"
                >
                  Mes données
                </Link>
              </li>
            </ul>
          </nav>

          <div className="flex flex-col gap-3">
            <h2 className="text-ink-strong text-sm font-medium">Repères</h2>
            <ul className="text-ink-muted flex flex-col gap-2 text-sm">
              <li>Expédition sous 48 h ouvrées</li>
              <li>Retour sous 30 jours</li>
              <li>Garantie constructeur 2 ans</li>
            </ul>
          </div>
        </div>

        <p className="text-ink-faint border-line-subtle mt-10 border-t pt-6 text-xs">
          Projet de démonstration. Le catalogue est fictif et aucune commande ne peut être passée.
        </p>
      </div>
    </footer>
  );
}
