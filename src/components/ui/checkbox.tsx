import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Case à cocher personnalisée.
 *
 * Contrairement au menu, elle **garde l'élément natif**, masqué visuellement
 * mais toujours présent : clavier, lecteur d'écran et soumission sans
 * JavaScript restent ceux du navigateur. Seul le dessin change, piloté par
 * `peer-checked` et `peer-focus-visible`.
 */
export function Checkbox({
  name,
  value,
  defaultChecked,
  onChange,
  children,
}: {
  name: string;
  value: string;
  defaultChecked?: boolean;
  onChange?: () => void;
  children: ReactNode;
}) {
  return (
    <label className="text-ink flex h-8 cursor-pointer items-center gap-2 text-sm select-none pointer-coarse:h-11">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "border-line-strong bg-surface-1 grid size-4 place-items-center rounded-sm border",
          "transition-colors duration-(--duration-fast)",
          "peer-checked:border-signal peer-checked:bg-signal",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ring)]",
          "[&>svg]:scale-50 [&>svg]:opacity-0 peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:opacity-100",
        )}
      >
        <svg
          viewBox="0 0 16 16"
          className="text-ink-strong ease-snap size-3 transition-[opacity,scale] duration-(--duration-fast)"
        >
          <path
            d="m3.5 8.5 3 3 6-7"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {children}
    </label>
  );
}
