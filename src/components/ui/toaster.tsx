"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Notifications (P6.3).
 *
 * Un seul `<Toaster>`, monté dans le layout racine. Deux instances produisent
 * deux piles qui s'ignorent, et un toast sur deux paraît disparaître.
 *
 * Les couleurs viennent des tokens du projet, pas du thème par défaut de la
 * bibliothèque : sans cela, les notifications seraient le seul endroit du site
 * à ne pas suivre la bascule clair/sombre.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      // Le nombre de notifications simultanées est borné : au-delà, la pile
      // masque le contenu au lieu de l'accompagner.
      visibleToasts={3}
      // Un toast porte une confirmation, jamais une information indispensable.
      // Il peut donc partir seul, et son action « Annuler » reste assez longue
      // pour être atteinte.
      duration={5000}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!bg-surface-1 !text-ink !border-line-subtle !rounded-lg !shadow-md !font-sans !text-sm",
          title: "!text-ink-strong !font-medium",
          description: "!text-ink-muted",
          actionButton: "!bg-action !text-on-action !rounded-md !text-xs !font-medium",
          cancelButton: "!bg-surface-2 !text-ink-strong !rounded-md !text-xs",
          error: "!text-peak-ink",
          success: "!text-jade-ink",
        },
      }}
    />
  );
}
