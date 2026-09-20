import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * Pagination du listing (P7.3).
 *
 * De vrais liens, pas des boutons : chaque page a une adresse, donc elle
 * s'ouvre dans un nouvel onglet, se copie et s'indexe. Une pagination bâtie
 * sur des `onClick` perd les trois.
 *
 * Server Component, sans un octet de JavaScript.
 */
export function Pagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  /** Conserve les filtres et la recherche en cours. */
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  const pages = pageNumbers(page, pageCount);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 pt-4">
      <PageLink href={buildHref(page - 1)} disabled={page <= 1} label="Page précédente">
        Précédent
      </PageLink>

      {pages.map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="text-ink-faint px-2 text-sm" aria-hidden>
            ...
          </span>
        ) : (
          <Link
            key={entry}
            href={buildHref(entry)}
            aria-label={`Page ${entry}`}
            aria-current={entry === page ? "page" : undefined}
            className={cn(
              "grid h-9 min-w-9 place-items-center rounded-md px-2 text-sm tabular-nums",
              "transition-colors duration-(--duration-instant)",
              entry === page
                ? "bg-action text-on-action font-medium"
                : "text-ink hover:bg-surface-2",
            )}
          >
            {entry}
          </Link>
        ),
      )}

      <PageLink href={buildHref(page + 1)} disabled={page >= pageCount} label="Page suivante">
        Suivant
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  // Un lien désactivé n'existe pas en HTML. Aux extrémités, on rend donc un
  // `<span>` plutôt qu'un lien inerte que le clavier atteindrait quand même.
  if (disabled) {
    return <span className="text-ink-faint px-3 text-sm">{children}</span>;
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="text-ink hover:bg-surface-2 rounded-md px-3 py-2 text-sm transition-colors duration-(--duration-instant)"
    >
      {children}
    </Link>
  );
}

/**
 * Fenêtre de numéros autour de la page courante.
 *
 * Au-delà de sept pages, afficher toute la liste occupe plus de place que la
 * grille elle-même sur un téléphone.
 */
function pageNumbers(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const around = [page - 1, page, page + 1].filter((value) => value > 1 && value < pageCount);
  const result: (number | "gap")[] = [1];

  if (around[0] !== undefined && around[0] > 2) result.push("gap");
  result.push(...around);
  if (around.at(-1) !== undefined && (around.at(-1) as number) < pageCount - 1) result.push("gap");
  result.push(pageCount);

  return result;
}
