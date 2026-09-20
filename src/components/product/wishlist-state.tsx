"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * État partagé de la liste de souhaits côté client (P10.1, P8.7).
 *
 * Ce composant existe à cause d'un conflit réel entre deux exigences.
 *
 * P8.7 demande que le cœur reflète la base, pas une supposition locale.
 * P10.1 demande que les grilles de produits soient prérendues. Or lire la
 * liste de souhaits côté serveur pour la passer aux cartes rend la page
 * dépendante de la session, donc impossible à prérendre.
 *
 * La lecture reste donc en base, mais elle passe côté client : **une seule**
 * requête par page, au montage, partagée par toutes les cartes. Douze cartes
 * n'en déclenchent pas douze.
 *
 * Conséquence visible et assumée : le cœur est vide pendant le temps de cette
 * requête. C'est un contrôle secondaire, pas une information dont dépend la
 * lecture de la page, et le compromis achète le prérendu de tout le catalogue.
 */

const WishlistContext = createContext<{ ids: Set<string>; ready: boolean }>({
  ids: new Set(),
  ready: false,
});

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // `AbortController` : une navigation rapide ne doit pas laisser une
    // réponse tardive écraser l'état de la page suivante.
    const controller = new AbortController();

    fetch("/api/wishlist", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { success: boolean; data: { product: { id: string } }[] } | null) => {
        if (!payload?.success) return;
        setIds(new Set(payload.data.map((entry) => entry.product.id)));
        setReady(true);
      })
      .catch(() => {
        // Échec silencieux : un cœur vide est une dégradation acceptable, un
        // message d'erreur au chargement de chaque page ne l'est pas.
      });

    return () => controller.abort();
  }, []);

  return <WishlistContext value={{ ids, ready }}>{children}</WishlistContext>;
}

/** `undefined` tant que l'état n'est pas connu, pour distinguer « pas encore lu » de « absent ». */
export function useIsInWishlist(productId: string): boolean {
  const { ids } = useContext(WishlistContext);
  return ids.has(productId);
}
