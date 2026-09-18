import { describe, expect, it } from "vitest";

import { NotFoundError, ValidationError } from "@/lib/errors";
import { createCartService } from "@/server/services/cart.service";
import { createUserService } from "@/server/services/user.service";
import { createWishlistService } from "@/server/services/wishlist.service";

import { makeProduct } from "../helpers/factories";
import {
  createFakeCartRepository,
  createFakeProductRepository,
  createFakeUserRepository,
  createFakeWishlistRepository,
} from "../helpers/fake-repositories";

/**
 * Service utilisateur (P4.8).
 *
 * Le brief demande la « gestion des données utilisateur », pas une
 * authentification. L'identité est une session anonyme persistante, et
 * l'exigence de la roadmap tient en une phrase : un utilisateur anonyme
 * conserve son panier entre deux visites.
 */

const USER = "6f3a1c2e-0d4b-4f8a-9c11-2b7d5e8a4f60";

function setup() {
  const product = makeProduct({ stock: 5, priceCents: 4_000 });
  const productRepository = createFakeProductRepository([product]);
  const cartRepository = createFakeCartRepository();
  const wishlistRepository = createFakeWishlistRepository();
  const userRepository = createFakeUserRepository([], {
    onDelete: (userId) => {
      void cartRepository.clear(userId);
      void wishlistRepository.clearAll(userId);
    },
  });

  const cartService = createCartService({ productRepository, cartRepository });
  const wishlistService = createWishlistService({
    productRepository,
    wishlistRepository,
    cartService,
  });
  const service = createUserService({ userRepository, cartService, wishlistService });

  return { service, cartService, wishlistService, product };
}

describe("getOrCreate", () => {
  it("crée la session à la première visite", async () => {
    const { service } = setup();
    const user = await service.getOrCreate(USER);

    expect(user.id).toBe(USER);
  });

  it("conserve le panier d'une visite à l'autre", async () => {
    // C'est le critère d'acceptation de la phase : rouvrir le site ne vide
    // pas le panier d'un visiteur anonyme.
    const { service, cartService, product } = setup();
    await service.getOrCreate(USER);
    await cartService.addItem(USER, { productId: product.id, quantity: 2 });

    await service.getOrCreate(USER);

    expect(await cartService.getItemCount(USER)).toBe(2);
  });

  it("conserve la date de création d'origine", async () => {
    const { service } = setup();
    const first = await service.getOrCreate(USER);
    const second = await service.getOrCreate(USER);

    expect(second.createdAt).toBe(first.createdAt);
  });
});

describe("getProfile", () => {
  it("échoue explicitement quand la session a expiré", async () => {
    const { service } = setup();
    await expect(service.getProfile(USER)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("updateProfile", () => {
  it("enregistre le nom d'affichage", async () => {
    const { service } = setup();
    await service.getOrCreate(USER);

    const updated = await service.updateProfile(USER, { displayName: "Daniel" });
    expect(updated.displayName).toBe("Daniel");
  });

  it("retire les espaces de bordure", async () => {
    const { service } = setup();
    await service.getOrCreate(USER);

    const updated = await service.updateProfile(USER, { displayName: "  Daniel  " });
    expect(updated.displayName).toBe("Daniel");
  });

  it("refuse un nom vide ou fait d'espaces", async () => {
    const { service } = setup();
    await service.getOrCreate(USER);

    await expect(service.updateProfile(USER, { displayName: "   " })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("refuse un nom démesuré", async () => {
    const { service } = setup();
    await service.getOrCreate(USER);

    await expect(
      service.updateProfile(USER, { displayName: "x".repeat(200) }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rattache chaque message d'erreur au champ réellement fautif", async () => {
    // Attribuer toute erreur au nom d'affichage afficherait « champ inconnu »
    // sous un nom parfaitement valide.
    const { service } = setup();
    await service.getOrCreate(USER);

    try {
      await service.updateProfile(USER, { displayName: "Daniel", admin: true });
      expect.unreachable("la validation aurait dû échouer");
    } catch (error) {
      const validation = error as ValidationError;
      expect(validation).toBeInstanceOf(ValidationError);
      expect(validation.fields?.["displayName"]).toBeUndefined();
    }
  });
});

describe("getOverview", () => {
  it("fonctionne quand la méthode est déstructurée du service", async () => {
    // Les Server Actions déstructurent volontiers. Une méthode qui dépend de
    // `this` casserait à ce moment précis, sans avertissement du typage.
    const { service } = setup();
    await service.getOrCreate(USER);
    const { getOverview } = service;

    await expect(getOverview(USER)).resolves.toMatchObject({ user: { id: USER } });
  });

  it("rassemble profil, panier et liste de souhaits", async () => {
    // Rend tangible ce que le site sait de l'utilisateur, et sert de base à
    // l'effacement comme à la page de transparence.
    const { service, cartService, wishlistService, product } = setup();
    await service.getOrCreate(USER);
    await cartService.addItem(USER, { productId: product.id, quantity: 2 });
    await wishlistService.add(USER, product.id);

    const overview = await service.getOverview(USER);

    expect(overview.user.id).toBe(USER);
    expect(overview.cart.itemCount).toBe(2);
    expect(overview.cart.subtotalCents).toBe(8_000);
    expect(overview.wishlist).toHaveLength(1);
  });
});

describe("eraseData", () => {
  it("efface réellement le profil, le panier et la liste de souhaits", async () => {
    // Droit à l'effacement : la donnée doit disparaître du stockage, pas
    // seulement de l'écran.
    const { service, cartService, wishlistService, product } = setup();
    await service.getOrCreate(USER);
    await cartService.addItem(USER, { productId: product.id, quantity: 1 });
    await wishlistService.add(USER, product.id);

    const { deleted } = await service.eraseData(USER);

    expect(deleted).toBeGreaterThan(0);
    await expect(service.getProfile(USER)).rejects.toBeInstanceOf(NotFoundError);
    expect(await cartService.getItemCount(USER)).toBe(0);
    expect(await wishlistService.list(USER)).toEqual([]);
  });

  it("effacer une session inexistante n'est pas une erreur", async () => {
    const { service } = setup();
    await expect(service.eraseData(USER)).resolves.toMatchObject({ deleted: 0 });
  });
});
