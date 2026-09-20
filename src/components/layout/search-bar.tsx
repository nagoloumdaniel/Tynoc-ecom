"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { MAX_SEARCH_LENGTH } from "@/lib/limits";

/**
 * Champ de recherche de l'en-tête (P6.4, P7.4).
 *
 * Soumission par formulaire plutôt que recherche à la frappe. Trois raisons :
 * la recherche vit dans l'URL, donc chaque frappe produirait une entrée
 * d'historique ; la navigation reste utilisable au clavier sans souris ; et
 * rien n'est envoyé tant que l'utilisateur n'a pas fini d'écrire.
 *
 * La page de résultats, elle, applique un filtrage en mémoire sur un catalogue
 * borné : il n'y a donc pas de gain à chercher avant la soumission.
 */
export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();

    // Une recherche vide ramène au catalogue complet plutôt qu'à une page
    // d'erreur ou à un `?q=` inutile dans l'adresse.
    router.push(query.length === 0 ? "/products" : `/products?q=${encodeURIComponent(query)}`);
  }

  return (
    <form role="search" onSubmit={submit} className={cn("relative", className)}>
      <label htmlFor="header-search" className="sr-only">
        Rechercher un produit
      </label>

      <Input
        id="header-search"
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={MAX_SEARCH_LENGTH}
        placeholder="Casque, micro, convertisseur..."
        className="pl-9"
        autoComplete="off"
      />

      <svg
        viewBox="0 0 20 20"
        className="text-ink-faint pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        aria-hidden
      >
        <circle cx="9" cy="9" r="6" />
        <path d="m14 14 3 3" strokeLinecap="round" />
      </svg>
    </form>
  );
}
