import "server-only";

import { randomUUID } from "node:crypto";

import { toAppError, type AppErrorCode } from "@/lib/errors";

/**
 * Résultat typé d'une Server Action (P5.7).
 *
 * Une Server Action ne doit **jamais** laisser remonter une exception au
 * client. Next sérialise l'erreur vers le navigateur, et le message d'une
 * panne interne y arriverait tel quel. Toutes les actions renvoient donc un
 * résultat, jamais une exception, et le message est celui que l'erreur a
 * déclaré exposable.
 *
 * Ce fichier ne porte pas `"use server"` : un module ainsi marqué ne peut
 * exporter que des fonctions asynchrones, or on y déclare aussi des types.
 */

export interface ActionFailure {
  success: false;
  error: {
    code: AppErrorCode;
    message: string;
    fields?: Record<string, string>;
    requestId: string;
  };
}

export type ActionResult<T> = { success: true; data: T } | ActionFailure;

/**
 * Exécute le corps d'une action et ramène toute erreur à un résultat.
 *
 * Même logique que `handleRoute` côté HTTP, même garantie : le détail reste
 * dans le log serveur, corrélé par `requestId`, et le client ne reçoit que ce
 * qui lui est destiné.
 */
export async function runAction<T>(
  context: string,
  run: () => Promise<T>,
): Promise<ActionResult<T>> {
  const requestId = randomUUID();

  try {
    return { success: true, data: await run() };
  } catch (error) {
    const appError = toAppError(error);

    console.error(
      JSON.stringify({
        level: appError.status >= 500 ? "error" : "warn",
        requestId,
        context,
        code: appError.code,
        message: appError.message,
      }),
    );

    return {
      success: false,
      error: {
        code: appError.code,
        message: appError.publicMessage,
        ...(appError.fields ? { fields: appError.fields } : {}),
        requestId,
      },
    };
  }
}
