import { AppError, ConflictError, DatabaseError, isAppError } from "@/lib/errors";

/**
 * Traduction des erreurs du SDK AWS en erreurs du domaine (P3.7).
 *
 * Règle du projet : **aucune erreur AWS brute ne remonte à l'UI**, pour deux
 * raisons indépendantes.
 *
 * Fonctionnelle : `ConditionalCheckFailedException` veut dire « ce produit est
 * déjà dans votre liste ». C'est un 409 avec un message utile. Laissée brute,
 * elle devient un 500 et un écran d'erreur générique.
 *
 * Sécurité : le message d'une erreur AWS contient le nom de la table, celui de
 * l'index, parfois un fragment d'expression. Rien de tout cela ne doit
 * atteindre un navigateur (P15.30).
 *
 * Le SDK v3 porte le type de l'erreur dans `name`, pas dans la classe : c'est
 * donc `name` que l'on inspecte.
 */

/**
 * Le seul cas où la base exprime une véritable règle métier : la condition
 * d'écriture a été refusée, donc l'état demandé contredit l'état existant.
 */
const CONFLICT_ERRORS = new Set([
  "ConditionalCheckFailedException",
  "TransactionCanceledException",
  "TransactionConflictException",
]);

export function translateDynamoError(error: unknown, context: string): AppError {
  // Un repository peut lever lui-même un NotFoundError. Le retraduire en panne
  // de base transformerait un 404 légitime en 500.
  if (isAppError(error)) return error;

  const name = error instanceof Error ? error.name : "ErreurInconnue";
  const detail = error instanceof Error ? error.message : String(error);

  if (CONFLICT_ERRORS.has(name)) {
    return new ConflictError("Cette opération entre en conflit avec l'état actuel.", {
      cause: error,
    });
  }

  // Tout le reste est une panne de notre côté, y compris `ValidationException`,
  // qui signifie que *notre* expression est fausse. La traduire en 400
  // accuserait l'utilisateur d'un bug interne.
  return new DatabaseError(`Échec DynamoDB pendant ${context} (${name}) : ${detail}`, {
    cause: error,
  });
}

/**
 * Enveloppe une opération DynamoDB.
 *
 * Le contexte est une phrase courte décrivant l'intention (« ajout au
 * panier »), pas le nom de la commande SDK : c'est ce qui rend un log
 * exploitable six mois plus tard.
 */
export async function withDynamoErrors<T>(context: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw translateDynamoError(error, context);
  }
}
