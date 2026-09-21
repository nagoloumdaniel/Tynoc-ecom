"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
 *
 * L'état est lu une fois, puis **tenu à jour** par chaque bascule confirmée.
 * Sans cela, le bouton revenait à la valeur du montage dès la fin de sa
 * transition : le cœur se vidait juste après un ajout réussi, sous une
 * notification qui annonçait le contraire (trouvé en revue, P12.1).
 */

interface WishlistState {
  ids: Set<string>;
  /** Reporte l'état confirmé par le serveur après une bascule. */
  confirm: (productId: string, inWishlist: boolean) => void;
}

const WishlistContext = createContext<WishlistState>({
  ids: new Set(),
  confirm: () => {},
});

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // `AbortController` : une navigation rapide ne doit pas laisser une
    // réponse tardive écraser l'état de la page suivante.
    const controller = new AbortController();

    fetch("/api/wishlist", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { success: boolean; data: { product: { id: string } }[] } | null) => {
        if (!payload?.success) return;
        setIds(new Set(payload.data.map((entry) => entry.product.id)));
      })
      .catch(() => {
        // Échec silencieux : un cœur vide est une dégradation acceptable, un
        // message d'erreur au chargement de chaque page ne l'est pas.
      });

    return () => controller.abort();
  }, []);

  const confirm = useCallback((productId: string, inWishlist: boolean) => {
    setIds((current) => {
      if (current.has(productId) === inWishlist) return current;

      const next = new Set(current);
      if (inWishlist) next.add(productId);
      else next.delete(productId);

      return next;
    });
  }, []);

  const value = useMemo(() => ({ ids, confirm }), [ids, confirm]);

  return <WishlistContext value={value}>{children}</WishlistContext>;
}

/** Vrai si le produit est en favori, d'après la dernière lecture ou bascule confirmée. */
export function useIsInWishlist(productId: string): boolean {
  const { ids } = useContext(WishlistContext);
  return ids.has(productId);
}

/** Mise à jour de l'état partagé, à appeler avec la réponse du serveur. */
export function useConfirmWishlist() {
  return useContext(WishlistContext).confirm;
}
