import { NotFoundError, ValidationError } from "@/lib/errors";
import type { CartSummary } from "@/schemas/cart";
import { userProfileUpdateSchema, type User, type UserProfileUpdate } from "@/schemas/user";
import type { WishlistEntry } from "@/schemas/wishlist";

/**
 * Logique métier de l'utilisateur et de sa session (P4.8).
 *
 * Le brief demande la « gestion des données utilisateur », pas une
 * authentification. L'identité est donc une session anonyme persistante, et la
 * propriété qui compte est la continuité : rouvrir le site ne vide pas le
 * panier.
 *
 * L'identifiant est **toujours** un paramètre, dérivé par l'appelant du cookie
 * serveur signé (P15.1). Ce service n'a aucun moyen de deviner qui appelle,
 * et c'est exactement ce qui rend la règle vérifiable en remontant les appels.
 */

interface UserStore {
  findById(userId: string): Promise<User | null>;
  findOrCreate(userId: string): Promise<User>;
  updateProfile(userId: string, update: UserProfileUpdate): Promise<User>;
  deleteAll(userId: string): Promise<number>;
}

interface CartReader {
  getSummary(userId: string): Promise<CartSummary>;
}

interface WishlistReader {
  list(userId: string): Promise<WishlistEntry[]>;
}

/** Tout ce que le site sait d'une session, en un objet. */
export interface UserOverview {
  user: User;
  cart: CartSummary;
  wishlist: WishlistEntry[];
}

export function createUserService(deps: {
  userRepository: UserStore;
  cartService: CartReader;
  wishlistService: WishlistReader;
}) {
  const { userRepository: users, cartService: cart, wishlistService: wishlist } = deps;

  /**
   * Déclaré en fonction nommée plutôt qu'en méthode appelée via `this` : une
   * Server Action écrit volontiers `const { getOverview } = userService`, et
   * une méthode qui dépend de `this` casserait à cet instant sans que le
   * typage n'ait rien signalé.
   */
  async function getProfile(userId: string): Promise<User> {
    const user = await users.findById(userId);

    if (!user) {
      throw new NotFoundError("Cette session n'existe plus.");
    }

    return user;
  }

  return {
    /**
     * Matérialise la session. Appelé à chaque requête entrante : il doit donc
     * être sans effet de bord visible au-delà du rafraîchissement de
     * l'échéance.
     */
    getOrCreate(userId: string): Promise<User> {
      return users.findOrCreate(userId);
    },

    getProfile,

    /**
     * Droit de rectification (art. 16).
     *
     * La validation passe par le schéma partagé, celui-là même qu'utilisera le
     * formulaire côté client : une seule définition, donc pas de règle qui
     * diverge entre les deux côtés (P9.4).
     */
    async updateProfile(userId: string, input: unknown): Promise<User> {
      const parsed = userProfileUpdateSchema.safeParse(input);

      if (!parsed.success) {
        // Chaque message est rattaché au champ réellement fautif. Tout
        // attribuer au nom d'affichage ferait apparaître « champ inconnu » sous
        // un nom parfaitement valide, et l'utilisateur corrigerait le mauvais
        // endroit.
        const fields: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path.join(".");
          if (field.length > 0) fields[field] ??= issue.message;
        }

        const first = parsed.error.issues[0];
        throw new ValidationError(first?.message ?? "Profil invalide.", {
          ...(Object.keys(fields).length > 0 ? { fields } : {}),
        });
      }

      return users.updateProfile(userId, parsed.data);
    },

    /**
     * Vue d'ensemble des données d'une session.
     *
     * Sert la page de transparence et prépare l'export : montrer ce que le site
     * sait est plus convaincant que de l'écrire dans une politique.
     */
    async getOverview(userId: string): Promise<UserOverview> {
      const [user, cartSummary, wishlistEntries] = await Promise.all([
        getProfile(userId),
        cart.getSummary(userId),
        wishlist.list(userId),
      ]);

      return { user, cart: cartSummary, wishlist: wishlistEntries };
    },

    /**
     * Droit à l'effacement (art. 17).
     *
     * Une seule opération, parce que profil, panier et liste de souhaits
     * partagent la même partition. Le nombre d'items réellement supprimés est
     * remonté pour que l'appelant puisse le vérifier au lieu de le supposer.
     *
     * Effacer une session qui n'existe pas n'est pas une erreur : le résultat
     * demandé est déjà atteint.
     */
    async eraseData(userId: string): Promise<{ deleted: number }> {
      return { deleted: await users.deleteAll(userId) };
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
