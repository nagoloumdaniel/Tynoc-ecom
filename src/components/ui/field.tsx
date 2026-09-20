import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Champs de saisie (P6.2).
 *
 * `Input` et `Select` partagent exactement la même enveloppe visuelle : un
 * filtre de prix et un filtre de tri posés côte à côte doivent avoir la même
 * hauteur, le même rayon et le même anneau de focus, sinon la barre de filtres
 * paraît bricolée.
 *
 * Le `select` est l'élément **natif**, délibérément. Sur mobile, le sélecteur
 * du système est plus rapide et plus accessible que n'importe quel menu
 * reconstruit, et il ne coûte pas une ligne de JavaScript.
 */
const control = cva(
  [
    "w-full rounded-md border bg-surface-1 text-ink-strong",
    "border-line-strong placeholder:text-ink-faint",
    "transition-colors duration-(--duration-instant)",
    "hover:border-ink-muted",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ],
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-10 px-3 text-sm",
      },
      invalid: {
        true: "border-peak",
        false: "",
      },
    },
    defaultVariants: { size: "md", invalid: false },
  },
);

type ControlVariants = VariantProps<typeof control>;

export type InputProps = Omit<ComponentProps<"input">, "size"> & ControlVariants;

export function Input({ className, size, invalid, ...props }: InputProps) {
  return (
    <input
      className={cn(control({ size, invalid }), className)}
      aria-invalid={invalid === true ? true : undefined}
      {...props}
    />
  );
}

export type SelectProps = Omit<ComponentProps<"select">, "size"> & ControlVariants;

export function Select({ className, size, invalid, ...props }: SelectProps) {
  return (
    <select
      className={cn(control({ size, invalid }), "cursor-pointer pr-8", className)}
      aria-invalid={invalid === true ? true : undefined}
      {...props}
    />
  );
}

/**
 * Étiquette, aide et message d'erreur d'un champ.
 *
 * Le message se place **sous le champ concerné** et y est rattaché par
 * `aria-describedby`. Une liste d'erreurs en haut de formulaire oblige à
 * retrouver soi-même le champ fautif, et un lecteur d'écran ne fait jamais le
 * lien (P9.4).
 */
export interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; "aria-describedby": string | undefined }) => ReactNode;
}

export function Field({ id, label, hint, error, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ink-strong text-sm font-medium">
        {label}
      </label>

      {hint ? (
        <p id={hintId} className="text-ink-muted text-xs">
          {hint}
        </p>
      ) : null}

      {children({ id, "aria-describedby": describedBy })}

      {error ? (
        // `role="alert"` : l'erreur est annoncée dès son apparition, sans que
        // l'utilisateur ait à revenir dessus.
        <p id={errorId} role="alert" className="text-peak-ink text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
