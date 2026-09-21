/**
 * Hiérarchie d'erreurs applicatives (P4.9).
 *
 * Deux principes portés par ce fichier, et un seul endroit pour les tenir.
 *
 * 1. **L'erreur porte son code et son statut**, pas l'appelant. Une route qui
 *    décide elle-même « ça, c'est un 404 » finit toujours par se tromper dans
 *    un cas sur dix, et personne ne s'en aperçoit avant la production.
 *
 * 2. **Tout message n'est pas montrable.** Une erreur de validation aide
 *    l'utilisateur ; une erreur de base de données lui parle de notre table,
 *    de notre index et de notre requête. Chaque erreur déclare donc si son
 *    message est exposable, et `publicMessage` applique la décision plutôt que
 *    de la laisser à chaque couche appelante (P15.30).
 */

export type AppErrorCode =
  | "NOT_FOUND"
  | "VALIDATION"
  | "FORBIDDEN"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "CONFLICT"
  | "DATABASE"
  | "INTERNAL";

/** Message rendu au client quand le message réel ne peut pas sortir du serveur. */
const GENERIC_MESSAGE = "Une opération n'a pas pu aboutir. Réessayez dans un instant.";

interface AppErrorOptions {
  cause?: unknown;
  /** Champ vers message, pour afficher l'erreur au bon endroit d'un formulaire. */
  fields?: Record<string, string>;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  /** Vrai quand `message` peut être affiché tel quel à l'utilisateur. */
  readonly expose: boolean;
  readonly fields: Record<string, string> | undefined;

  constructor(
    code: AppErrorCode,
    status: number,
    expose: boolean,
    message: string,
    options: AppErrorOptions = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });

    this.code = code;
    this.status = status;
    this.expose = expose;
    this.fields = options.fields;
    this.name = new.target.name;

    // Sans cette ligne, une classe qui étend Error cesse de répondre à
    // `instanceof` une fois transpilée vers une cible ancienne. Le coût est
    // d'une ligne, le symptôme est un `catch` qui ne rattrape plus rien.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Message destiné au client : le vrai, ou un générique s'il ne sort pas. */
  get publicMessage(): string {
    return this.expose ? this.message : GENERIC_MESSAGE;
  }
}

/** Ressource demandée inexistante. Mène à `notFound()` ou à un 404 structuré. */
export class NotFoundError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, true, message, options);
  }
}

/** Entrée refusée à la frontière. Le message guide la correction. */
export class ValidationError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("VALIDATION", 400, true, message, options);
  }
}

/**
 * Requête refusée pour sa provenance, pas pour son contenu (P12.3).
 *
 * Aujourd'hui : une écriture d'API émise depuis une autre origine.
 */
export class ForbiddenError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("FORBIDDEN", 403, true, message, options);
  }
}

/** Corps envoyé dans un format que la route ne lit pas (P12.3). */
export class UnsupportedMediaTypeError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("UNSUPPORTED_MEDIA_TYPE", 415, true, message, options);
  }
}

/** L'état demandé contredit l'état existant : doublon, concurrence. */
export class ConflictError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("CONFLICT", 409, true, message, options);
  }
}

/**
 * Défaillance de la couche de données. Jamais exposée : son message contient
 * des noms de table, d'index et parfois des fragments de requête.
 */
export class DatabaseError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("DATABASE", 500, false, message, options);
  }
}

/** Tout le reste. Jamais exposée non plus. */
export class InternalError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, false, message, options);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Ramène n'importe quelle valeur lancée à une erreur du domaine.
 *
 * `throw "oups"` est légal en JavaScript : une couche de traduction qui
 * suppose un objet `Error` casse au pire moment. La cause d'origine est
 * conservée pour le log serveur, jamais pour le client.
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (error instanceof Error) {
    return new InternalError(error.message, { cause: error });
  }

  return new InternalError(`Valeur non-Error lancée : ${String(error)}`, { cause: error });
}
