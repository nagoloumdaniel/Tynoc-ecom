"use client";

import { useRouter } from "next/navigation";
import { useRef, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/field";
import type { Category } from "@/schemas/category";
import type { StorefrontQuery } from "@/schemas/api";

/**
 * Barre de filtres du listing (P7.3).
 *
 * C'est un vrai formulaire `GET` pointant sur `/products`, avec les mêmes noms
 * de champs que la query string. Les menus sont des composants personnalisés
 * (`Dropdown`) : chacun porte sa valeur dans un champ caché, donc le formulaire
 * se lit et se soumet comme avec des `select` natifs.
 *
 * Contrepartie, dite plutôt que masquée : sans JavaScript, ces menus ne
 * s'ouvrent pas. Elle ne coûte rien en pratique, la barre elle-même arrivant
 * en flux et restant invisible sans script (mesuré en P11). Seule la case à
 * cocher garde l'élément natif sous son dessin.
 *
 * L'état vit **entièrement dans l'URL**, jamais dans un état React. Une
 * sélection est donc partageable, rechargeable, et le bouton « retour » du
 * navigateur fait ce qu'on en attend.
 *
 * Les champs vides sont retirés avant la navigation, sinon l'adresse se
 * remplit de `&minPrice=&maxPrice=&sort=` qui ne filtrent rien.
 *
 * Les champs sont non contrôlés, initialisés depuis l'URL. Une navigation
 * client ne remonte pas ce composant : sans clé, ils gardaient leur ancienne
 * valeur après « Réinitialiser » ou un retour arrière, et le changement de
 * filtre suivant renvoyait l'ancienne sélection (trouvé en revue, P12.1). La
 * clé du formulaire dérive donc de la requête : une nouvelle adresse, un
 * nouveau formulaire, aux valeurs justes.
 */
export function FilterBar({
  categories,
  query,
}: {
  categories: Category[];
  query: StorefrontQuery;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);

  function apply(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!form.current) return;

    const data = new FormData(form.current);
    const params = new URLSearchParams();

    for (const [key, value] of data) {
      if (typeof value === "string" && value.trim().length > 0) params.set(key, value);
    }

    const search = params.toString();
    router.push(search.length > 0 ? `/products?${search}` : "/products");
  }

  return (
    <form
      key={formKey(query)}
      ref={form}
      // Repli sans JavaScript : la soumission native vise la même page avec
      // les mêmes noms de champs.
      action="/products"
      method="get"
      onSubmit={apply}
      className="border-line-subtle flex flex-wrap items-end gap-3 border-b pb-5"
    >
      {/* La recherche en cours doit survivre à un changement de filtre. */}
      {query.q ? <input type="hidden" name="q" value={query.q} /> : null}

      <FilterField label="Catégorie" htmlFor="filter-category">
        <Dropdown
          id="filter-category"
          name="category"
          size="sm"
          aria-labelledby="filter-category-label"
          className="min-w-40"
          defaultValue={query.category ?? ""}
          options={[
            { value: "", label: "Toutes" },
            ...categories.map((category) => ({ value: category.slug, label: category.name })),
          ]}
          onValueChange={() => apply()}
        />
      </FilterField>

      <FilterField label="Prix min." htmlFor="filter-min">
        <Input
          id="filter-min"
          name="minPrice"
          type="number"
          inputMode="numeric"
          min={0}
          step={10}
          size="sm"
          placeholder="0 €"
          defaultValue={query.minPrice ?? ""}
          className="w-24"
        />
      </FilterField>

      <FilterField label="Prix max." htmlFor="filter-max">
        <Input
          id="filter-max"
          name="maxPrice"
          type="number"
          inputMode="numeric"
          min={0}
          step={10}
          size="sm"
          placeholder="2000 €"
          defaultValue={query.maxPrice ?? ""}
          className="w-24"
        />
      </FilterField>

      <FilterField label="Tri" htmlFor="filter-sort">
        <Dropdown
          id="filter-sort"
          name="sort"
          size="sm"
          aria-labelledby="filter-sort-label"
          className="min-w-40"
          defaultValue={query.sort ?? "newest"}
          options={SORT_OPTIONS}
          onValueChange={() => apply()}
        />
      </FilterField>

      <Checkbox
        name="inStock"
        value="true"
        defaultChecked={query.inStock === "true"}
        onChange={() => apply()}
      >
        Disponibles seulement
      </Checkbox>

      {/* Visible sans JavaScript, inutile avec : les champs s'appliquent déjà
          au changement. Le garder coûte peu et évite un cul-de-sac. */}
      <Button type="submit" variant="outline" size="sm">
        Appliquer
      </Button>

      {hasActiveFilter(query) ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            router.push(query.q ? `/products?q=${encodeURIComponent(query.q)}` : "/products")
          }
        >
          Réinitialiser
        </Button>
      ) : null}
    </form>
  );
}

/** Empreinte stable des filtres affichés, dans un ordre fixe. */
function formKey(query: StorefrontQuery): string {
  return [query.q, query.category, query.minPrice, query.maxPrice, query.sort, query.inStock]
    .map((value) => value ?? "")
    .join("|");
}

const SORT_OPTIONS = [
  { value: "newest", label: "Nouveautés" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "name", label: "Nom" },
];

function hasActiveFilter(query: StorefrontQuery): boolean {
  return Boolean(query.category || query.minPrice || query.maxPrice || query.inStock || query.sort);
}

function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label id={`${htmlFor}-label`} htmlFor={htmlFor} className="text-ink-muted text-xs">
        {label}
      </label>
      {children}
    </div>
  );
}
