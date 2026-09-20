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
  /** Saisie en cours. `null` signifie « affiche la valeur courante ». */
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Valeur en attente d'envoi, ou `null` si rien n'est différé. */
  const queued = useRef<number | null>(null);

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

  // Un démontage pendant le délai **envoie** la valeur en attente au lieu de
  // l'abandonner.
  //
  // C'était l'inverse, et un test de bout en bout l'a pris en défaut : quitter
  // le panier moins d'une demi-seconde après un clic sur « plus » perdait la
  // modification, sans rien dire. Le délai existe pour regrouper les écritures,
  // pas pour les annuler. L'intention est exprimée dès le clic.
  //
  // Reste une fenêtre que rien ne peut couvrir ici : un rechargement complet de
  // la page interrompt la requête en vol. Elle dure le temps du délai, et la
  // traiter demanderait un envoi hors cycle de vie, sans rapport avec le gain.
  useEffect(
    () => () => {
      const next = takeQueued();
      // Envoi sans attente de réponse : le composant n'existe plus, il n'y a
      // plus d'affichage à corriger. L'écriture, elle, doit partir.
      if (next !== null) void setCartQuantityAction({ productId, quantity: next });
    },
    [productId],
  );

  /** Annule le minuteur et rend la valeur qu'il portait. */
  function takeQueued(): number | null {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    const next = queued.current;
    queued.current = null;

    return next;
  }

  function schedule(next: number) {
    setDisplayed(next);
    takeQueued();
    queued.current = next;

    timer.current = setTimeout(() => {
      timer.current = null;
      queued.current = null;

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
    setDraft(null);
    const next = Math.min(Math.max(displayed + delta, 1), ceiling);
    if (next !== displayed) schedule(next);
  }

  /**
   * Valide la saisie manuelle.
   *
   * Un champ vidé puis quitté revient à la valeur courante plutôt que de
   * déclencher un retrait : supprimer une ligne est une autre action, avec sa
   * propre confirmation et sa propre annulation.
   */
  function commitDraft() {
    const raw = draft;
    setDraft(null);
    if (raw === null) return;

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;

    const next = Math.min(Math.max(parsed, 1), ceiling);
    if (next !== displayed) schedule(next);
  }

  return (
    <div
      className={cn(
        "border-line-strong inline-flex h-9 items-center rounded-md border",
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

      {/* Saisie directe en plus des boutons (P8.2). Passer de 1 à 9 au clavier
          demande huit clics autrement, et sur mobile la frappe est plus rapide
          que la visée d'une cible de 36 pixels. */}
      <input
        type="text"
        inputMode="numeric"
        // `aria-live` sur le conteneur annoncerait chaque frappe. C'est le
        // libellé du champ qui porte la valeur, et il suffit.
        aria-label="Quantité"
        value={draft ?? String(displayed)}
        onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
        // Validation à la sortie du champ et non à la frappe : taper « 12 »
        // passe par « 1 », et envoyer cet état intermédiaire produirait deux
        // écritures dont la première est fausse.
        onBlur={() => commitDraft()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") setDraft(null);
        }}
        className="text-ink-strong w-10 bg-transparent text-center text-sm font-medium tabular-nums focus:outline-none"
      />

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
