"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { removeFromCartAction } from "@/server/actions/cart";

/**
 * Lignes orphelines (P8.9).
 *
 * Un produit retiré du catalogue laisse une ligne sans prix ni titre. Le
 * service la signale au lieu de la supprimer en silence, parce que
 * l'utilisateur doit comprendre pourquoi son total a changé entre deux
 * visites.
 *
 * Reste à lui donner le moyen de nettoyer. Sans ce bouton, la ligne resterait
 * indéfiniment dans son panier et dans le compteur de l'en-tête, sans aucune
 * action possible.
 */
export function OrphanLines({ productIds }: { productIds: string[] }) {
  const [pending, startTransition] = useTransition();

  if (productIds.length === 0) return null;

  function removeAll() {
    startTransition(async () => {
      for (const productId of productIds) {
        const result = await removeFromCartAction({ productId });
        if (!result.success) {
          toast.error(result.error.message);
          return;
        }
      }

      toast.success(
        productIds.length > 1 ? "Articles indisponibles retirés" : "Article indisponible retiré",
      );
    });
  }

  return (
    <Card tone="outline" className="border-peak/40 flex flex-col gap-3 p-4" role="status">
      <div className="flex flex-col gap-1">
        <h2 className="text-ink-strong text-sm font-medium">
          {productIds.length > 1
            ? `${productIds.length} articles ne sont plus au catalogue.`
            : "Un article n'est plus au catalogue."}
        </h2>
        <p className="text-ink-muted text-sm">
          Ils ont été retirés de la vente depuis votre dernière visite et ne comptent pas dans le
          total.
        </p>
      </div>

      <div>
        <Button variant="outline" size="sm" onClick={removeAll} disabled={pending}>
          {pending ? "Retrait..." : "Retirer du panier"}
        </Button>
      </div>
    </Card>
  );
}
