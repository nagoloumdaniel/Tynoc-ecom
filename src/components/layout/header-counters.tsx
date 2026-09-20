import { cartService, productService, wishlistService } from "@/server/services";
import { getOptionalSessionUserId } from "@/server/session";

import { Header } from "./header";

/**
 * Chargement des données de l'en-tête.
 *
 * Séparé du rendu pour une raison précise : lire le cookie de session bascule
 * la route en rendu dynamique. En isolant cette lecture dans un composant
 * placé sous `<Suspense>`, la coquille de la page reste prérendable et seuls
 * les compteurs attendent la session.
 *
 * `getOptionalSessionUserId` plutôt que la variante stricte : un compteur
 * affiche zéro, il ne fait pas échouer la page entière.
 */
export async function HeaderWithCounters() {
  const userId = await getOptionalSessionUserId();

  const [categories, cartCount, wishlist] = await Promise.all([
    productService.listCategories(),
    userId ? cartService.getItemCount(userId) : Promise.resolve(0),
    userId ? wishlistService.list(userId) : Promise.resolve([]),
  ]);

  return <Header categories={categories} cartCount={cartCount} wishlistCount={wishlist.length} />;
}
