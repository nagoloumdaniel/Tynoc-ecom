"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/feedback/states";

/**
 * Frontière d'erreur de l'application (P9.2).
 *
 * Elle couvre toutes les routes qui n'ont pas la leur, et remplace la page
 * blanche par quelque chose d'utilisable. C'était le pire état du site :
 * DynamoDB injoignable, le rendu échouait et le visiteur recevait un document
 * vide, sans message ni moyen de réessayer.
 *
 * **`retry` et non `reset`** : la prop a été renommée en Next.js 16, et elle
 * est stable depuis la 16.3, la version de ce projet.
 *
 * Un `error.tsx` doit être un Client Component, parce qu'une frontière
 * d'erreur React est un composant à état. Il enveloppe `loading`, `not-found`,
 * `page` et les layouts imbriqués, mais **pas** le layout de son propre
 * segment : les erreurs de la mise en page racine relèvent de
 * `global-error.tsx`.
 *
 * Le message affiché ne vient jamais de l'erreur. Sa propriété `message` peut
 * contenir un nom de table ou un fragment de requête ; en production Next le
 * remplace d'ailleurs par un texte générique et ne conserve qu'un `digest`
 * pour le rapprochement côté serveur.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Un log structuré, comme pour les routes API, avec le digest comme seul
    // identifiant de corrélation.
    console.error(
      JSON.stringify({ level: "error", context: "frontière d'erreur", digest: error.digest }),
    );
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-24 md:px-6">
      <ErrorState
        title="Cette page n'a pas pu se charger."
        description="La connexion à la base de données a échoué. Le problème vient de notre côté, pas de votre navigation."
        onRetry={retry}
      />

      {error.digest ? (
        <p className="text-ink-faint mt-4 text-center text-xs">
          Référence de l&apos;incident : <span className="tabular-nums">{error.digest}</span>
        </p>
      ) : null}
    </div>
  );
}
