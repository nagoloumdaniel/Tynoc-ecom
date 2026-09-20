"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Dialogue et tiroir, bâtis sur l'élément `<dialog>` natif (P6.1, P6.5).
 *
 * C'est la raison pour laquelle le projet n'embarque aucune bibliothèque de
 * composants. Ouvert par `showModal()`, un `<dialog>` fournit gratuitement ce
 * qui est long et fragile à réécrire :
 *
 * - le **piège de focus**, y compris le retour au déclencheur à la fermeture ;
 * - la touche **Échap**, via l'événement `cancel` ;
 * - l'**inertie** de tout l'arrière-plan, sans `aria-hidden` à poser à la main ;
 * - le fond, stylable par `::backdrop`.
 *
 * Deux choses restent à notre charge, et une seule est évidente : le verrou de
 * défilement, que la spécification ne garantit pas, et la fermeture au
 * changement de route.
 */

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Titre lu par les technologies d'assistance, visible ou non. */
  title: string;
  /** `drawer` glisse depuis la gauche, `center` apparaît au centre. */
  placement?: "center" | "drawer";
  children: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  placement = "center",
  children,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // `open={...}` en attribut n'ouvre pas un dialogue **modal** : seul
    // `showModal()` active le piège de focus et l'inertie de l'arrière-plan.
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // La spécification ne verrouille pas le défilement du document derrière un
    // dialogue modal. Sans cela, le contenu glisse sous le tiroir au moindre
    // mouvement de doigt.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      // `cancel` couvre Échap. Sans ce relais, le dialogue se fermerait
      // visuellement pendant que l'état de React le croirait encore ouvert,
      // et le rouvrir deviendrait impossible.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      // Le clic sur le fond atteint le `<dialog>` lui-même, jamais son
      // contenu : comparer la cible suffit à distinguer les deux.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "bg-surface-1 text-ink m-0 max-h-dvh p-0",
        "backdrop:bg-ink-strong/40 backdrop:backdrop-blur-[2px]",
        placement === "drawer"
          ? "h-dvh w-[min(22rem,85vw)] rounded-none border-r"
          : "mx-auto my-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border shadow-lg",
        "border-line-subtle",
        className,
      )}
    >
      {children}
    </dialog>
  );
}
