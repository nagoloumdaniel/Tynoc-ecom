import { randomUUID } from "node:crypto";

import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import {
  toAppError,
  UnsupportedMediaTypeError,
  ValidationError,
  type AppErrorCode,
} from "./errors";

/**
 * Enveloppe d'API, traitement centralisé des erreurs et garde-fous d'entrée
 * (P5.1, P5.9, P5.10).
 *
 * Toutes les routes répondent avec la même forme, succès comme échec. Sans
 * cela, chaque client doit connaître le format particulier de chaque endpoint,
 * et le premier oubli produit un 500 avec une trace d'appels dedans.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: {
    code: AppErrorCode;
    message: string;
    /** Champ vers message, pour afficher l'erreur au bon endroit d'un formulaire. */
    fields?: Record<string, string>;
    /** Permet de rapprocher ce que l'utilisateur a vu du log serveur correspondant. */
    requestId: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/**
 * Taille maximale d'un corps de requête (P15.21).
 *
 * Les corps de cette API sont des objets de quelques champs. 16 Kio laissent
 * une marge confortable tout en rendant inoffensif un envoi de dix mégaoctets.
 */
export const MAX_REQUEST_BODY_BYTES = 16 * 1024;

/**
 * Traduit n'importe quelle valeur lancée en réponse d'API.
 *
 * Fonction pure, séparée du reste : c'est elle qui décide du statut et de ce
 * qui franchit la frontière HTTP, donc elle se teste sans requête ni serveur.
 */
export function errorToApiPayload(
  error: unknown,
  requestId: string,
): { status: number; body: ApiFailure } {
  const appError = toAppError(error);

  return {
    status: appError.status,
    body: {
      success: false,
      error: {
        code: appError.code,
        // `publicMessage` applique la décision d'exposition prise à la
        // construction de l'erreur. Rien ici ne peut la contourner par
        // inadvertance (P15.30).
        message: appError.publicMessage,
        ...(appError.fields ? { fields: appError.fields } : {}),
        requestId,
      },
    },
  };
}

/** Réponse de succès. */
export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/** Succès sans contenu, pour une suppression. */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Enveloppe une route.
 *
 * Toute erreur qui remonte jusqu'ici est traduite, journalisée côté serveur
 * avec son identifiant de corrélation, et renvoyée sous la forme commune. Une
 * route n'a donc jamais besoin d'écrire un `try/catch`, et ne peut pas oublier
 * d'en écrire un.
 */
export async function handleRoute<T>(
  context: string,
  run: () => Promise<NextResponse<ApiSuccess<T>> | NextResponse>,
): Promise<NextResponse> {
  const requestId = randomUUID();

  try {
    return await run();
  } catch (error) {
    // Next signale par une exception interne qu'il faut abandonner un
    // prérendu ou effectuer une redirection. L'avaler la transformerait en
    // réponse 500, et surtout en réponse **mise en cache**. Depuis
    // l'activation des Cache Components, les routes `GET` suivent le modèle
    // de prérendu des pages : le cas s'est produit au build, avec un 500
    // journalisé sur `/api/products`.
    unstable_rethrow(error);

    const appError = toAppError(error);
    const { status, body } = errorToApiPayload(appError, requestId);

    // Log structuré, sans donnée personnelle (P15.29) : le contexte et
    // l'identifiant suffisent à retrouver l'incident, et le message complet
    // reste côté serveur.
    console.error(
      JSON.stringify({
        level: status >= 500 ? "error" : "warn",
        requestId,
        context,
        code: appError.code,
        status,
        message: appError.message,
      }),
    );

    return NextResponse.json(body, { status });
  }
}

function fieldsFromIssues(issues: { path: PropertyKey[]; message: string }[]) {
  const fields: Record<string, string> = {};

  for (const issue of issues) {
    const field = issue.path.map(String).join(".");
    if (field.length > 0) fields[field] ??= issue.message;
  }

  return Object.keys(fields).length > 0 ? fields : undefined;
}

function validationError(message: string, issues: { path: PropertyKey[]; message: string }[]) {
  const fields = fieldsFromIssues(issues);
  return new ValidationError(message, fields ? { fields } : {});
}

/**
 * Valide les paramètres d'URL contre un schéma.
 *
 * Les valeurs d'une query string sont toujours des chaînes : le schéma doit
 * faire la conversion, et c'est lui qui décide ce qui est acceptable. Un
 * paramètre invalide produit un 400 explicite, jamais un comportement
 * silencieusement différent (P5.2).
 */
export function parseQuery<T>(schema: ZodType<T>, url: URL): T {
  const raw: Record<string, string> = {};

  for (const [key, value] of url.searchParams) {
    // Premier gagnant : `?page=1&page=2` ne doit pas devenir un tableau
    // inattendu au milieu d'un schéma qui attend un nombre.
    raw[key] ??= value;
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw validationError("Paramètres de requête invalides.", parsed.error.issues);
  }

  return parsed.data;
}

/**
 * Lit et valide un corps JSON.
 *
 * Quatre contrôles, dans cet ordre, et l'ordre compte : type de contenu,
 * taille annoncée, taille réelle, puis forme. Valider avant d'avoir borné la
 * taille reviendrait à charger dix mégaoctets en mémoire avant de les refuser.
 *
 * Le type de contenu est exigé (P12.3). Un navigateur peut envoyer un corps
 * `text/plain` vers une autre origine sans requête préalable : c'est une
 * « requête simple ». Exiger `application/json` impose au contraire un
 * contrôle CORS préalable, que notre API ne satisfait pour aucune origine
 * étrangère. Le JSON n'était pas lu autrement, donc rien ne se perd.
 */
export async function readJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    throw new UnsupportedMediaTypeError("Corps de requête attendu en application/json.");
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BODY_BYTES) {
    throw new ValidationError("Corps de requête trop volumineux.");
  }

  const text = await request.text();
  // Un `Content-Length` absent ou menteur ne doit pas suffire à contourner la
  // borne : on revérifie sur le contenu réellement reçu.
  if (Buffer.byteLength(text, "utf8") > MAX_REQUEST_BODY_BYTES) {
    throw new ValidationError("Corps de requête trop volumineux.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new ValidationError("Corps de requête illisible : JSON attendu.");
  }

  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    throw validationError("Corps de requête invalide.", parsed.error.issues);
  }

  return parsed.data;
}
