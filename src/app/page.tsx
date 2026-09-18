/**
 * Planche de contrôle des tokens (P1.4 / P1.5).
 *
 * Provisoire : cette page sert à valider la direction artistique à l'œil, dans
 * les deux thèmes, avant d'écrire le moindre composant. Elle est remplacée par
 * l'accueil réel en P7.2.
 */

const surfaces = [
  { token: "surface-0", className: "bg-surface-0", role: "Fond de page" },
  { token: "surface-1", className: "bg-surface-1", role: "Carte, en-tête" },
  { token: "surface-2", className: "bg-surface-2", role: "Champ, zone creuse" },
  { token: "surface-3", className: "bg-surface-3", role: "Survol, pressé" },
];

const semantics = [
  { token: "signal", className: "bg-signal", role: "Actif, attention" },
  { token: "peak", className: "bg-peak", role: "Limite, erreur" },
  { token: "jade", className: "bg-jade", role: "Disponible, réussi" },
];

export default function TokenSheet() {
  return (
    <main className="mx-auto w-full max-w-(--container-page) px-6 py-16 md:px-10">
      <header className="border-line-subtle border-b pb-10">
        <h1 className="text-5xl font-semibold tracking-tighter font-stretch-90%">Tynoc</h1>
        <p className="text-ink-muted mt-4 max-w-[52ch] text-lg">
          Casques, enceintes, convertisseurs et accessoires choisis pour leurs mesures autant que
          pour leur écoute.
        </p>
      </header>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">Surfaces</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {surfaces.map((swatch) => (
            <div key={swatch.token} className="border-line-subtle rounded-lg border p-4 shadow-xs">
              <div className={`${swatch.className} border-line-subtle h-16 rounded-md border`} />
              <p className="text-ink-strong mt-3 text-sm font-medium">{swatch.token}</p>
              <p className="text-ink-muted text-xs">{swatch.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Signalétique</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {semantics.map((swatch) => (
            <div key={swatch.token} className="border-line-subtle rounded-lg border p-4">
              <div className={`${swatch.className} h-16 rounded-md`} />
              <p className="text-ink-strong mt-3 text-sm font-medium">{swatch.token}</p>
              <p className="text-ink-muted text-xs">{swatch.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Encre et échelle</h2>
        <div className="mt-5 space-y-2">
          <p className="text-4xl font-semibold tracking-tighter font-stretch-90%">
            Sennheiser HD 660S2
          </p>
          <p className="text-ink text-base">
            Casque ouvert, 300 Ω. Réponse tenue jusqu’à 8 Hz, distorsion sous 0,04 % à 1 kHz.
          </p>
          <p className="text-ink-muted text-sm">Livré sous 48 h · Retour sous 30 jours</p>
          <p className="text-ink-faint text-xs">Référence TYN-HD660S2-BLK</p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Actions et états</h2>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="bg-action text-on-action hover:bg-action-hover rounded-md px-5 py-2.5 text-sm font-medium transition-colors duration-(--duration-instant)"
          >
            Ajouter au panier
          </button>
          <button
            type="button"
            className="border-line text-ink-strong hover:bg-surface-2 rounded-md border px-5 py-2.5 text-sm font-medium transition-colors duration-(--duration-instant)"
          >
            Mettre en favori
          </button>
          <span className="text-jade-ink bg-jade-soft inline-flex items-center gap-2 rounded-sm px-2.5 py-1 text-xs font-medium">
            <span className="bg-jade size-1.5 rounded-full" />
            En stock
          </span>
          <span className="text-signal-ink bg-signal-soft rounded-sm px-2.5 py-1 text-xs font-medium">
            Plus que 3 exemplaires
          </span>
          <span className="text-peak-ink bg-peak-soft rounded-sm px-2.5 py-1 text-xs font-medium">
            Rupture de stock
          </span>
        </div>
        <p className="text-ink-muted mt-6 text-sm">
          Les prix s’alignent en chiffres tabulaires :{" "}
          <span className="text-ink-strong font-medium">549,00 €</span> ·{" "}
          <span className="text-ink-strong font-medium">1 119,00 €</span> ·{" "}
          <span className="text-ink-strong font-medium">89,90 €</span>
        </p>
      </section>
    </main>
  );
}
