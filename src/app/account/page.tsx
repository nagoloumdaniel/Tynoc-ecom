import type { Metadata } from "next";
import { Suspense } from "react";

import { EraseData } from "@/components/account/erase-data";
import { ProfileForm } from "@/components/account/profile-form";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ButtonLink } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/surface";
import { formatPrice } from "@/lib/cn";
import { SESSION_TTL_DAYS } from "@/lib/limits";
import { userService } from "@/server/services";
import { getSessionUserId } from "@/server/session";

export const metadata: Metadata = {
  title: "Mes données",
  robots: { index: false, follow: false },
};

/**
 * Page « mes données » (P9.4, et P16.11 pour la transparence).
 *
 * Le brief liste la gestion des données utilisateur parmi les fonctionnalités
 * attendues. Elle existait depuis P3 côté base et depuis P4 côté service, mais
 * sans aucune interface : un visiteur ne pouvait ni voir, ni corriger, ni
 * effacer ce que le site savait de lui.
 *
 * Montrer les données est plus convaincant que les décrire. La page affiche ce
 * qui est réellement stocké, y compris l'identifiant de session, plutôt que de
 * l'affirmer dans une politique de confidentialité que personne ne lit.
 */
export default function AccountPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 md:px-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Mes données" }]} />

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Mes données</h1>
        <p className="text-ink-muted max-w-[62ch] text-sm">
          Ce site fonctionne sans compte. Une session anonyme conserve votre panier et vos favoris
          d&apos;une visite à l&apos;autre. Voici exactement ce qu&apos;elle contient.
        </p>
      </header>

      {/* Tout ce qui suit dépend de la session : prérendre l'ossature, laisser
          le contenu arriver en flux (P10.1). */}
      <Suspense fallback={<AccountSkeleton />}>
        <AccountContent />
      </Suspense>
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div className="flex flex-col gap-8" role="status" aria-label="Chargement de vos données">
      <Skeleton className="h-28 w-full max-w-sm" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

async function AccountContent() {
  const userId = await getSessionUserId();

  // La session n'existe en base qu'à partir de la première écriture. Une
  // visite sans aucun ajout n'a donc encore rien à montrer, ce qui n'est pas
  // une erreur.
  await userService.getOrCreate(userId);
  const overview = await userService.getOverview(userId);

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="text-ink-strong text-lg font-semibold">Profil</h2>
        <ProfileForm displayName={overview.user.displayName} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-ink-strong text-lg font-semibold">Ce qui est stocké</h2>

        <Card tone="sunken" className="overflow-hidden">
          <dl className="divide-line-subtle divide-y text-sm">
            <Row label="Identifiant de session">
              <span className="tabular-nums">{overview.user.id}</span>
            </Row>
            <Row label="Première visite">
              {new Date(overview.user.createdAt).toLocaleDateString("fr-FR")}
            </Row>
            <Row label="Dernière activité">
              {new Date(overview.user.lastSeenAt).toLocaleDateString("fr-FR")}
            </Row>
            <Row label="Articles au panier">
              <span className="tabular-nums">
                {overview.cart.itemCount} pour {formatPrice(overview.cart.subtotalCents)}
              </span>
            </Row>
            <Row label="Favoris">
              <span className="tabular-nums">{overview.wishlist.length}</span>
            </Row>
          </dl>
        </Card>

        <p className="text-ink-muted text-sm">
          Aucune adresse e-mail, aucun nom réel et aucune adresse IP ne sont conservés. Sans
          activité pendant {SESSION_TTL_DAYS} jours, tout est supprimé automatiquement par la base
          de données.
        </p>
      </section>

      <section className="border-line-subtle flex flex-col gap-4 border-t pt-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-ink-strong text-lg font-semibold">Supprimer mes données</h2>
          <p className="text-ink-muted max-w-[62ch] text-sm">
            Efface le profil, le panier et les favoris. La suppression est immédiate et définitive.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <EraseData />
          <ButtonLink href="/products" variant="outline">
            Retour au catalogue
          </ButtonLink>
        </div>
      </section>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink-strong break-all">{children}</dd>
    </div>
  );
}
