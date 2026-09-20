import Link from "next/link";
import { Fragment } from "react";

/**
 * Fil d'Ariane (P7.8).
 *
 * Le dernier élément n'est pas un lien et porte `aria-current="page"` : un
 * lien vers la page où l'on se trouve déjà est un faux affordance, et un
 * lecteur d'écran l'annonce comme une destination possible.
 *
 * Structure en liste ordonnée, parce que l'ordre porte du sens : chaque niveau
 * contient le suivant.
 */
export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-ink-muted text-xs">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const last = index === items.length - 1;

          return (
            <Fragment key={`${item.label}-${index}`}>
              <li>
                {item.href && !last ? (
                  <Link
                    href={item.href}
                    className="hover:text-ink-strong transition-colors duration-(--duration-instant)"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-ink" aria-current={last ? "page" : undefined}>
                    {item.label}
                  </span>
                )}
              </li>

              {last ? null : (
                <li aria-hidden className="text-ink-faint">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
