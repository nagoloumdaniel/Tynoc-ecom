"use client";

import { useRouter } from "next/navigation";
import { useRef, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import type { Category } from "@/schemas/category";
import type { StorefrontQuery } from "@/schemas/api";

/**
 * Barre de filtres du listing (P7.3).
 *
 * C'est un vrai formulaire `GET` pointant sur `/products`. Sans JavaScript, il
 * fonctionne quand même : le navigateur construit la query string lui-même et
 * la page se recharge filtrée. Le JavaScript n'ajoute que le confort, à savoir
 * l'application immédiate au changement d'un champ et la navigation sans
 * rechargement complet.
 *
 * L'état vit **entièrement dans l'URL**, jamais dans un état React. Une
 * sélection est donc partageable, rechargeable, et le bouton « retour » du
 * navigateur fait ce qu'on en attend.
 *
 * Les champs vides sont retirés avant la navigation, sinon l'adresse se
 * remplit de `&minPrice=&maxPrice=&sort=` qui ne filtrent rien.
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
        <Select
          id="filter-category"
          name="category"
          size="sm"
          defaultValue={query.category ?? ""}
          onChange={() => apply()}
        >
          <option value="">Toutes</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </Select>
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
        <Select
          id="filter-sort"
          name="sort"
          size="sm"
          defaultValue={query.sort ?? "newest"}
          onChange={() => apply()}
        >
          <option value="newest">Nouveautés</option>
          <option value="price-asc">Prix croissant</option>
          <option value="price-desc">Prix décroissant</option>
          <option value="name">Nom</option>
        </Select>
      </FilterField>

      <label className="text-ink flex h-8 cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="inStock"
          value="true"
          defaultChecked={query.inStock === "true"}
          onChange={() => apply()}
          className="accent-signal size-4"
        />
        Disponibles seulement
      </label>

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
      <label htmlFor={htmlFor} className="text-ink-muted text-xs">
        {label}
      </label>
      {children}
    </div>
  );
}
