import type { Product } from "@/schemas/product";

import { ProductCard } from "./product-card";

/**
 * Grille de produits (P6.7).
 *
 * Une à quatre colonnes selon la largeur. L'espacement vertical est plus
 * généreux que l'horizontal : les cartes d'une même rangée se lisent comme un
 * ensemble, celles de deux rangées successives ne doivent pas se confondre.
 *
 * Les quatre premières cartes portent `priority` : ce sont les seules
 * susceptibles d'être au-dessus de la ligne de flottaison, et c'est parmi
 * elles que se trouve l'image qui décide du LCP.
 */
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}
