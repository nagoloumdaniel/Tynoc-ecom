"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/cn";
import { MAX_QUANTITY_PER_LINE } from "@/lib/limits";
import { setCartQuantityAction } from "@/server/actions/cart";

/**
 * Sélecteur de quantité (P6.8, P8.2).
 *
 * Le composant le plus délicat de la phase, pour une raison précise : un clic
 * répété sur « plus » ne doit pas produire une rafale de requêtes.
 *
 * La quantité affichée change **immédiatement**, et l'envoi au serveur est
 * différé. Tant que l'utilisateur continue de cliquer, le minuteur repart : un
 * passage de 1 à 6 en cinq clics ne déclenche qu'un seul appel, avec la valeur
 * finale. C'est aussi ce qui évite d'envoyer des états intermédiaires que le
 * serveur refuserait, comme un 4 transitoire au-dessus d'un stock de 3.
 *
 * En cas d'échec, l'affichage revient à la dernière valeur confirmée par le
 * serveur, pas à une valeur devinée.
 */

/** Assez court pour rester imperceptible, assez long pour absorber une rafale. */
const FLUSH_DELAY_MS = 450;

export function QuantityStepper({
  productId,
  quantity,
  max,
  className,
}: {
  productId: string;
  quantity: number;
  /** Stock disponible. Le plafond effectif est le plus petit des deux. */
  max: number;
  className?: string;
}) {
  const ceiling = Math.max(1, Math.min(max, MAX_QUANTITY_PER_LINE));
  const [displayed, setDisplayed] = useState(quantity);
  const [confirmed, setConfirmed] = useState(quantity);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // La valeur serveur fait autorité : elle peut changer sous nos pieds, par
  // exemple après un retrait depuis un autre onglet.
  //
  // L'ajustement se fait **pendant le rendu** et non dans un effet. Synchroniser
  // une prop vers un état par `useEffect` provoque un second rendu en cascade,
  // et affiche brièvement la valeur périmée. React recommande cette forme, et
  // la règle de lint la fait respecter.
  if (quantity !== confirmed) {
    setConfirmed(quantity);
    setDisplayed(quantity);
  }

  // Un composant démonté pendant le délai ne doit pas déclencher son envoi.
  useEffect(() => () => clearTimer(), []);

  function clearTimer() {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function schedule(next: number) {
    setDisplayed(next);
    clearTimer();

    timer.current = setTimeout(() => {
      startTransition(async () => {
        const result = await setCartQuantityAction({ productId, quantity: next });

        if (!result.success) {
          // Retour à la dernière valeur confirmée par le serveur, pas à une
          // valeur devinée.
          setDisplayed(confirmed);
          toast.error(result.error.message);
          return;
        }

        if (result.data.adjusted) {
          // Le serveur a borné la demande. Le dire, plutôt que de laisser
          // l'utilisateur constater un nombre qu'il n'a pas choisi.
          toast.info(`Quantité ajustée au stock disponible.`);
        }
      });
    }, FLUSH_DELAY_MS);
  }

  function step(delta: number) {
    const next = Math.min(Math.max(displayed + delta, 1), ceiling);
    if (next !== displayed) schedule(next);
  }

  return (
    <div
      className={cn(
        "border-line inline-flex h-9 items-center rounded-md border",
        pending && "opacity-70",
        className,
      )}
    >
      <StepButton
        label="Diminuer la quantité"
        // Le plancher est 1 : passer à zéro serait un retrait, qui est une
        // autre action avec sa propre confirmation.
        disabled={displayed <= 1}
        onClick={() => step(-1)}
      >
        <MinusIcon />
      </StepButton>

      <output
        // `aria-live` : la nouvelle quantité est annoncée sans déplacer le
        // focus, qui reste sur le bouton pour permettre un second clic.
        aria-live="polite"
        aria-label={`Quantité : ${displayed}`}
        className="text-ink-strong w-9 text-center text-sm font-medium tabular-nums"
      >
        {displayed}
      </output>

      <StepButton
        label="Augmenter la quantité"
        disabled={displayed >= ceiling}
        onClick={() => step(1)}
      >
        <PlusIcon />
      </StepButton>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "text-ink-strong grid h-full w-9 place-items-center",
        "transition-colors duration-(--duration-instant)",
        "hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <path d="M3 8h10" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
    </svg>
  );
}
