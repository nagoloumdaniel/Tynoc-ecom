/**
 * Provenance d'une requête d'écriture (P12.3, anticipe P15.17).
 *
 * Les Server Actions vérifient déjà leur origine : Next compare `Origin` à
 * l'hôte et refuse l'écart. Les routes API, elles, n'avaient aucun contrôle.
 * Le cookie `SameSite=Lax` bloque déjà l'essentiel, puisqu'il n'accompagne pas
 * un `POST` intersite. Mais `Lax` ne distingue pas deux sous-domaines d'un
 * même site, et une défense qui repose sur une seule propriété du navigateur
 * n'en est qu'une moitié.
 *
 * Module pur : aucune dépendance au framework, testable tel quel.
 */

/**
 * Vrai si la requête vient manifestement d'une autre origine.
 *
 * Trois signaux, par ordre de fiabilité :
 *
 * 1. `Origin`, envoyé par tout navigateur récent sur une requête d'écriture.
 *    Il doit désigner le même hôte que la requête.
 * 2. `Sec-Fetch-Site`, à défaut : `cross-site` suffit à refuser.
 * 3. Ni l'un ni l'autre : ce n'est pas un navigateur (curl, test, appel
 *    serveur à serveur). Aucun cookie ambiant n'y est joint à l'insu de
 *    quelqu'un, donc le risque de falsification de requête n'existe pas, et
 *    la requête passe.
 */
export function isCrossOriginRequest(headers: {
  origin: string | null;
  secFetchSite: string | null;
  host: string | null;
}): boolean {
  const { origin, secFetchSite, host } = headers;

  if (origin !== null) {
    // `Origin: null` est ce qu'envoie un document opaque (iframe `sandbox`,
    // fichier local) : jamais une provenance légitime pour notre API.
    if (origin === "null" || host === null) return true;

    try {
      return new URL(origin).host !== host;
    } catch {
      return true;
    }
  }

  return secFetchSite === "cross-site";
}
