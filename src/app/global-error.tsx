"use client";

/**
 * Frontière d'erreur de dernier recours (P9.2).
 *
 * Elle ne se déclenche que si la **mise en page racine** échoue, par exemple
 * parce que l'en-tête n'a pas pu lire la base. Dans ce cas `error.tsx` ne peut
 * rien faire : il vit à l'intérieur de cette mise en page.
 *
 * Trois contraintes propres à ce fichier, toutes imposées par Next :
 *
 * - il **remplace** la mise en page racine, donc il doit déclarer lui-même
 *   `<html>` et `<body>` ;
 * - il ne reçoit **pas** les styles globaux, donc les tokens du projet n'y
 *   sont pas disponibles et les couleurs sont écrites en clair ici, à la seule
 *   exception du site ;
 * - une frontière d'erreur étant un Client Component, `metadata` n'y est pas
 *   possible : le titre passe par le composant `<title>` de React.
 *
 * Le rendu reste volontairement minimal. Si la mise en page racine ne tient
 * pas, il ne faut rien supposer d'autre, pas même une police chargée.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          // `light-dark()` fonctionne sans feuille de style, à condition de
          // déclarer le schéma de couleurs ici.
          colorScheme: "light dark",
          backgroundColor: "light-dark(#fafafa, #16181c)",
          color: "light-dark(#26282d, #e6e8ec)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>Erreur · Tynoc</title>

        <main style={{ maxWidth: "34rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
            Le site est momentanément indisponible.
          </h1>

          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, margin: "0 0 1.5rem", opacity: 0.8 }}>
            Une panne empêche l&apos;affichage. Réessayez dans un instant ; si le problème persiste,
            il se résoudra de notre côté.
          </p>

          <button
            type="button"
            onClick={() => retry()}
            style={{
              cursor: "pointer",
              borderRadius: "0.375rem",
              border: "1px solid light-dark(#d4d6da, #5a5f68)",
              backgroundColor: "transparent",
              color: "inherit",
              padding: "0.625rem 1.25rem",
              font: "inherit",
              fontSize: "0.875rem",
            }}
          >
            Réessayer
          </button>

          {error.digest ? (
            <p style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "1.5rem" }}>
              Référence de l&apos;incident : {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
