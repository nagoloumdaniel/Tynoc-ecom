"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

/**
 * Menu déroulant personnalisé (remplace le `<select>` natif).
 *
 * Il suit le motif « combobox à sélection seule » des pratiques d'accessibilité
 * du W3C (APG), parce qu'un menu reconstruit n'a le droit de remplacer le
 * natif qu'à condition de tout refaire de ce que le natif offrait gratuitement :
 *
 * - **clavier** : flèches, Début et Fin, Entrée et Espace, Échap, Tab ;
 * - **recherche par frappe** : taper « mi » atteint « Microphones » ;
 * - **lecteur d'écran** : rôles `combobox` et `listbox`, option active
 *   annoncée par `aria-activedescendant`, sans déplacer le focus ;
 * - **formulaire** : un `<input type="hidden">` porte la valeur, donc
 *   `FormData` la lit comme celle d'un `select`.
 *
 * Le focus reste toujours sur le bouton : c'est ce que recommande le motif, et
 * c'est ce qui évite de perdre la position de l'utilisateur à la fermeture.
 */

export interface DropdownOption {
  value: string;
  label: string;
}

/** Délai au-delà duquel la recherche par frappe repart de zéro. */
const TYPEAHEAD_RESET_MS = 500;

/** Minuscules sans accents : taper « e » doit atteindre « Écouteurs ». */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr");
}

export function Dropdown({
  id,
  name,
  options,
  defaultValue,
  onValueChange,
  size = "md",
  className,
  "aria-labelledby": labelledBy,
}: {
  id: string;
  name: string;
  options: DropdownOption[];
  defaultValue: string;
  onValueChange?: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
  "aria-labelledby"?: string;
}) {
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const root = useRef<HTMLDivElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];

  // Clic en dehors : fermeture sans changer la valeur, comme le natif.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // L'option active reste visible quand on la déplace au clavier dans une
  // liste plus haute que sa boîte.
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  function openAt(index: number) {
    setActive(index);
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    setOpen(false);
    if (!option || option.value === value) return;

    // La valeur est écrite dans le champ caché **avant** de prévenir le
    // parent : la barre de filtres relit le formulaire dans le même tour, avant
    // que React ait re-rendu. Sans cela, elle naviguerait avec l'ancienne
    // valeur.
    if (hidden.current) hidden.current.value = option.value;
    setValue(option.value);
    onValueChange?.(option.value);
  }

  /** Recherche par frappe : cumule les touches rapprochées. */
  function typeahead(key: string) {
    const now = Date.now();
    const previous = typed.current;
    const text = now - previous.at > TYPEAHEAD_RESET_MS ? key : previous.text + key;
    typed.current = { text, at: now };

    const needle = fold(text);
    const current = open ? active : selectedIndex;
    // Une première lettre cherche **après** l'option courante, puis boucle :
    // taper deux fois « c » passe de « Casques » à « Convertisseurs ». Une suite de
    // lettres affine au contraire l'option courante, qui peut déjà convenir.
    const start = text.length === 1 ? current + 1 : current;
    const match = options
      .map((_, offset) => (start + offset) % options.length)
      .find((index) => fold(options[index]?.label ?? "").startsWith(needle));

    if (match === undefined) return;
    if (open) setActive(match);
    else openAt(match);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openAt(selectedIndex);
        else setActive((index) => Math.min(index + 1, last));
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!open) openAt(selectedIndex);
        else setActive((index) => Math.max(index - 1, 0));
        return;
      case "Home":
        event.preventDefault();
        openAt(0);
        return;
      case "End":
        event.preventDefault();
        openAt(last);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) choose(active);
        else openAt(selectedIndex);
        return;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        return;
      case "Tab":
        // Le motif APG : quitter le champ au clavier valide l'option active.
        if (open) choose(active);
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          typeahead(event.key);
        }
    }
  }

  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <div ref={root} className={cn("relative", className)}>
      <input ref={hidden} type="hidden" name={name} defaultValue={value} />

      <button
        id={id}
        type="button"
        role="combobox"
        aria-labelledby={labelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex))}
        onKeyDown={onKeyDown}
        className={cn(
          "bg-surface-1 text-ink-strong border-line-strong flex w-full items-center justify-between gap-2 rounded-md border text-left",
          "hover:border-ink-muted transition-colors duration-(--duration-instant)",
          open && "border-ink-muted",
          size === "sm" ? "h-8 px-2.5 text-xs" : "h-10 px-3 text-sm",
        )}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={labelledBy}
          // Liste non focalisable : le focus reste sur le bouton (APG).
          tabIndex={-1}
          className={cn(
            "animate-popover bg-surface-1 border-line-subtle shadow-lg",
            "absolute top-[calc(100%+4px)] left-0 z-[var(--z-popover)] min-w-full",
            // Neuf options tiennent sans défiler à la souris ; au-delà, ou sur un
            // petit écran, la liste défile plutôt que de sortir de la fenêtre.
            "max-h-[min(22rem,60vh)] overflow-y-auto rounded-lg border p-1",
          )}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === active;

            return (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                // `pointerdown` et non `click` : le bouton perdrait sinon le
                // focus avant la sélection, et le clic extérieur fermerait la
                // liste en premier.
                onPointerDown={(event) => {
                  event.preventDefault();
                  choose(index);
                }}
                onPointerEnter={() => setActive(index)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-md whitespace-nowrap",
                  // Cible tactile : 44 px sur pointeur grossier, compacte à la souris.
                  "min-h-9 px-2.5 text-sm pointer-coarse:min-h-11",
                  isActive ? "bg-surface-2 text-ink-strong" : "text-ink",
                  isSelected && "font-medium",
                )}
              >
                <span>{option.label}</span>
                {isSelected ? <CheckIcon /> : <span className="size-3.5" aria-hidden />}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={cn(
        "text-ink-muted ease-snap size-3.5 shrink-0 transition-transform duration-(--duration-fast)",
        open && "rotate-180",
      )}
    >
      <path
        d="m4 6 4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="text-signal-ink size-3.5 shrink-0">
      <path
        d="m3.5 8.5 3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
