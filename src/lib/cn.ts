import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fusion de classes utilitaires.
 *
 * `clsx` règle les conditions, `tailwind-merge` règle les collisions : sans
 * lui, `class="px-4"` passé en surcharge à un composant qui déclare déjà
 * `px-6` produit deux classes concurrentes dont c'est l'ordre dans la feuille
 * de style, et non l'intention de l'appelant, qui décide.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formate un montant en centimes pour l'affichage.
 *
 * Les prix vivent en entiers de centimes de bout en bout ; la division par
 * cent n'a lieu qu'ici, au dernier moment, pour l'œil humain.
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
