"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { userProfileUpdateSchema } from "@/schemas/user";
import { updateProfileAction } from "@/server/actions/user";

/**
 * Formulaire de profil (P9.4).
 *
 * La validation s'exécute **des deux côtés, avec le même schéma Zod**. Ce
 * n'est pas de la redondance :
 *
 * - côté client, elle évite un aller-retour pour une faute évidente et place
 *   le message sous le champ concerné ;
 * - côté serveur, elle est la seule qui compte, parce qu'une Server Action est
 *   un endpoint public et que rien n'oblige un appelant à passer par ce
 *   formulaire.
 *
 * Une seule définition partagée, donc aucune règle qui diverge entre les deux.
 * Deux validations écrites séparément finissent toujours par ne plus dire la
 * même chose, et c'est le client qui a l'air cassé.
 */
export function ProfileForm({ displayName }: { displayName: string | undefined }) {
  const [value, setValue] = useState(displayName ?? "");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = userProfileUpdateSchema.safeParse({ displayName: value });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Nom d'affichage invalide.");
      return;
    }

    setError(undefined);

    startTransition(async () => {
      const result = await updateProfileAction(parsed.data);

      if (!result.success) {
        // Le serveur reste l'autorité : son message remplace le nôtre, et il
        // sait rattacher l'erreur au bon champ.
        setError(result.error.fields?.["displayName"] ?? result.error.message);
        return;
      }

      toast.success("Nom enregistré");
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-sm flex-col gap-4">
      <Field
        id="display-name"
        label="Nom d'affichage"
        hint="Facultatif. Utilisé uniquement pour vous accueillir sur le site."
        {...(error === undefined ? {} : { error })}
      >
        {(props) => (
          <Input
            {...props}
            name="displayName"
            value={value}
            maxLength={60}
            onChange={(event) => setValue(event.target.value)}
            invalid={error !== undefined}
            autoComplete="nickname"
          />
        )}
      </Field>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
