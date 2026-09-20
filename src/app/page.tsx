import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { EmptyState, ErrorState, ProductGridSkeleton } from "@/components/feedback/states";
import { ProductGrid } from "@/components/product/product-grid";
import { AvailabilityBadge, Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Card } from "@/components/ui/surface";
import { formatPrice } from "@/lib/cn";
import { productService } from "@/server/services";

/**
 * Planche de revue du design system (P6.10).
 *
 * Provisoire, comme l'était la planche de tokens qu'elle remplace. Elle sert à
 * juger les composants côte à côte, dans les deux thèmes et à toutes les
 * largeurs, **avant** d'assembler les pages. Une primitive dont on découvre le
 * défaut une fois utilisée dans six écrans coûte six corrections.
 *
 * Les produits viennent de la vraie base : une grille alimentée par des titres
 * fictifs de longueur égale cacherait justement les problèmes de hauteur que
 * cette planche doit révéler.
 *
 * Remplacée par l'accueil réel en P7.2.
 */
export default async function DesignReview() {
  const { items } = await productService.search({ pageSize: 8, sort: "newest" });
  const sample = items[0];

  return (
    <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-16 px-4 py-14 md:px-6">
      <header className="border-line-subtle border-b pb-8">
        <h1 className="text-4xl font-semibold tracking-tighter font-stretch-90%">
          Revue du design system
        </h1>
        <p className="text-ink-muted mt-3 max-w-[58ch] text-base">
          Les primitives réunies sur une page, dans leurs états. Tout provient des tokens : aucune
          valeur en dur, aucune classe de thème dupliquée.
        </p>
      </header>

      <Section title="Boutons" description="Variantes, tailles et états désactivés.">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Ajouter au panier</Button>
          <Button variant="outline">Mettre en favori</Button>
          <Button variant="ghost">Voir les détails</Button>
          <Button variant="danger">Vider le panier</Button>
          <Button disabled>Indisponible</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Petit</Button>
          <Button size="md">Moyen</Button>
          <Button size="lg">Grand</Button>
          <ButtonLink href="/products" variant="outline">
            Lien stylé en bouton
          </ButtonLink>
        </div>
      </Section>

      <Section title="Champs" description="Même hauteur et même anneau de focus, par construction.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input placeholder="Rechercher un produit" />
          <Select defaultValue="newest">
            <option value="newest">Nouveautés</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </Select>
          <Input placeholder="Champ en erreur" invalid />
        </div>
      </Section>

      <Section
        title="Signalétique"
        description="Trois couleurs, trois sens. Jamais de couleur seule."
      >
        <div className="flex flex-wrap items-center gap-3">
          <AvailabilityBadge availability="in-stock" />
          <AvailabilityBadge availability="low-stock" stock={3} />
          <AvailabilityBadge availability="out-of-stock" />
          <Badge tone="neutral">Ouvert</Badge>
          <Badge tone="neutral">Studio</Badge>
        </div>
      </Section>

      <Section
        title="Sélecteur de quantité"
        description="Plancher à 1, plafond au stock, envoi différé."
      >
        {sample ? (
          <div className="flex flex-wrap items-center gap-6">
            <QuantityStepper productId={sample.id} quantity={1} max={sample.stock} />
            <QuantityStepper productId={sample.id} quantity={10} max={10} />
            <span className="text-ink-strong text-sm font-semibold">
              {formatPrice(sample.priceCents)}
            </span>
          </div>
        ) : null}
      </Section>

      <Section
        title="Grille produits"
        description="Hauteur stable quelle que soit la longueur des titres."
      >
        <ProductGrid products={items} />
      </Section>

      <Section
        title="Chargement"
        description="Le squelette reprend la géométrie exacte du contenu."
      >
        <ProductGridSkeleton count={4} />
      </Section>

      <Section
        title="États"
        description="Chaque état vide propose une sortie, chaque erreur dit quoi faire."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <EmptyState
            title="Votre panier est vide."
            description="Parcourez le catalogue pour y ajouter un premier article."
            action={{ label: "Parcourir le catalogue", href: "/products" }}
          />
          <ErrorState
            title="Le catalogue est momentanément injoignable."
            description="La connexion à la base de données a échoué. Réessayez dans quelques instants."
          />
        </div>
      </Section>

      <Section title="Surfaces" description="En clair par l'ombre, en sombre par la luminosité.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card tone="raised" className="p-5 text-sm">
            Carte posée
          </Card>
          <Card tone="sunken" className="p-5 text-sm">
            Zone creuse
          </Card>
          <Card tone="outline" className="p-5 text-sm">
            Contour seul
          </Card>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-ink-strong text-xl font-semibold">{title}</h2>
        <p className="text-ink-muted mt-1 text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}
