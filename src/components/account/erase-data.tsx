"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { eraseMyDataAction } from "@/server/actions/user";

/**
 * Effacement des données (P16.13).
 *
 * Deux principes tenus ici.
 *
 * **La confirmation est explicite**, dans un dialogue modal, parce que
 * l'opération est irréversible et qu'elle n'a pas d'annulation possible,
 * contrairement au retrait d'une ligne de panier.
 *
 * **Le résultat est constaté, pas affirmé.** Le serveur renvoie le nombre
 * d'items réellement supprimés, et c'est ce nombre qui est annoncé. Un message
 * de succès écrit à l'avance affirmerait une suppression sans savoir si elle a
 * eu lieu.
 */
export function EraseData() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function erase() {
    startTransition(async () => {
      const result = await eraseMyDataAction();
      setOpen(false);

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(
        result.data.deleted === 0
          ? "Aucune donnée à supprimer."
          : `${result.data.deleted} ${result.data.deleted > 1 ? "éléments supprimés" : "élément supprimé"}.`,
      );
    });
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Supprimer mes données
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Supprimer mes données">
        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-ink-strong text-lg font-semibold">Supprimer mes données ?</h2>
            <p className="text-ink-muted text-sm">
              Votre profil, votre panier et vos favoris seront effacés de la base. Cette action est
              définitive et ne peut pas être annulée.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={erase} disabled={pending}>
              {pending ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
