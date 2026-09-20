import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * Bouton (P6.2).
 *
 * API par **variantes**, jamais par props booléennes : `variant="ghost"` et
 * non `isGhost` plus `isPrimary`. Deux booléens autorisent quatre
 * combinaisons dont deux n'ont aucun sens, et rien dans le typage ne les
 * empêche.
 *
 * Aucune valeur en dur : toutes les couleurs, durées et rayons viennent des
 * tokens. Aucune classe `dark:` non plus, les tokens basculent seuls.
 */
const button = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-md font-medium",
    "whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,transform] duration-(--duration-instant)",
    // Enfoncement léger à la pression : un élément cliquable doit se sentir
    // cliquable, et un simple changement d'opacité ne le donne pas.
    "active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        /** Encre pleine. L'action principale d'un écran, une seule à la fois. */
        primary: "bg-action text-on-action hover:bg-action-hover",
        /** Bordée. Action secondaire de même importance fonctionnelle. */
        outline: "border-line-strong text-ink-strong hover:bg-surface-2 border",
        /** Sans fond. Actions de barre d'outils, icônes. */
        ghost: "text-ink-strong hover:bg-surface-2",
        /** Destructif. Réservé à ce qui retire réellement quelque chose. */
        danger: "bg-peak text-on-action hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        /** Carré, pour une icône seule. */
        icon: "size-10",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof button>;

export function Button({ className, variant, size, block, type, ...props }: ButtonProps) {
  return (
    <button
      // Un bouton sans `type` explicite vaut `submit` dans un formulaire, ce
      // qui envoie le formulaire au premier clic sur n'importe quel bouton.
      type={type ?? "button"}
      className={cn(button({ variant, size, block }), className)}
      {...props}
    />
  );
}

/**
 * Lien qui a l'apparence d'un bouton.
 *
 * Composant distinct, et non une prop `as` : un lien et un bouton ne sont pas
 * interchangeables. Un lien navigue, s'ouvre dans un nouvel onglet, se copie ;
 * un bouton agit. Les rendre permutables par une prop invite à écrire un
 * `<button>` là où l'utilisateur attend une adresse.
 *
 * L'apparence, elle, est bien partagée : c'est la même fabrique de classes.
 */
export type ButtonLinkProps = ComponentProps<typeof Link> & VariantProps<typeof button>;

export function ButtonLink({ className, variant, size, block, ...props }: ButtonLinkProps) {
  return <Link className={cn(button({ variant, size, block }), className)} {...props} />;
}

export { button as buttonVariants };
