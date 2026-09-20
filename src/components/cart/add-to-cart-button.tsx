"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { addToCartAction } from "@/server/actions/cart";

/**
 * Ajout au panier (P7.6, P8.5).
 *
 * Présent sur la fiche produit comme sur la carte : le même composant, donc le
 * même comportement, les mêmes messages et la même gestion du refus.
 *
 * Trois retours distincts, parce que trois choses différentes peuvent arriver.
 * L'ajout passe tel quel, et on le confirme avec un lien vers le panier.
 * L'ajout passe mais la quantité a été bornée par le stock, et on le dit,
 * sinon l'utilisateur découvre un nombre qu'il n'a pas choisi. L'ajout est
 * refusé, et le message du serveur explique pourquoi.
 */
export function AddToCartButton({
  productId,
  quantity = 1,
  disabled,
  children,
  ...props
}: {
  productId: string;
  quantity?: number;
} & ButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // `router.push` et non `window.location` : ce dernier recharge le document
  // entier, donc reconstruit la coquille, refait les lectures de l'en-tête et
  // perd la position de défilement.
  const goToCart = () => router.push("/cart");

  function add() {
    startTransition(async () => {
      const result = await addToCartAction({ productId, quantity });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      if (result.data.adjusted) {
        toast.info("Quantité ajustée au stock disponible.", {
          action: { label: "Voir le panier", onClick: goToCart },
        });
        return;
      }

      toast.success("Ajouté au panier", {
        // Le verbe de l'action reste le même de bout en bout : le bouton dit
        // « Ajouter au panier », la confirmation dit « Ajouté au panier ».
        action: { label: "Voir le panier", onClick: goToCart },
      });
    });
  }

  return (
    <Button onClick={add} disabled={disabled === true || pending} {...props}>
      {pending ? "Ajout..." : children}
    </Button>
  );
}
