import { env } from "@/lib/env";
import type { Product } from "@/schemas/product";

/**
 * Données structurées JSON-LD (P10.5).
 *
 * Elles disent à un moteur ce que la page contient : un produit, son prix, sa
 * disponibilité. C'est ce qui permet d'afficher le prix et le stock
 * directement dans les résultats de recherche, au lieu d'un simple lien.
 *
 * Le script est rendu par le serveur et son contenu vient de nos propres
 * entités, jamais d'une saisie utilisateur. `JSON.stringify` échappe par
 * ailleurs ce qu'il sérialise, et le seul caractère qui pourrait clore la
 * balise prématurément est neutralisé ci-dessous.
 */

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Une chaîne contenant `</script>` fermerait la balise au milieu du
      // JSON. Le cas est théorique ici, puisque tout vient du catalogue, mais
      // la parade coûte un remplacement.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

const AVAILABILITY = {
  "in-stock": "https://schema.org/InStock",
  "low-stock": "https://schema.org/LimitedAvailability",
  "out-of-stock": "https://schema.org/OutOfStock",
} as const;

export function ProductJsonLd({
  product,
  availability,
}: {
  product: Product;
  availability: keyof typeof AVAILABILITY;
}) {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: `${product.brand} ${product.title}`,
        description: product.summary,
        sku: product.id,
        brand: { "@type": "Brand", name: product.brand },
        image: product.images.map((image) => image.url),
        offers: {
          "@type": "Offer",
          url: `${base}/products/${product.slug}`,
          priceCurrency: "EUR",
          // Le prix vit en centimes dans tout le projet ; schema.org attend
          // une valeur décimale.
          price: (product.priceCents / 100).toFixed(2),
          availability: AVAILABILITY[availability],
        },
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: `${base}${item.path}`,
        })),
      }}
    />
  );
}

/** Liste de produits d'une page de catégorie ou de listing. */
export function ItemListJsonLd({ products }: { products: Product[] }) {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${base}/products/${product.slug}`,
          name: `${product.brand} ${product.title}`,
        })),
      }}
    />
  );
}
