import { describe, expect, it } from "vitest";

import { ConflictError, NotFoundError } from "@/lib/errors";
import { MAX_WISHLIST_ITEMS } from "@/lib/limits";
import { createCartService } from "@/server/services/cart.service";
import { createWishlistService } from "@/server/services/wishlist.service";

import { makeProduct } from "../helpers/factories";
import {
  createFakeCartRepository,
  createFakeProductRepository,
  createFakeWishlistRepository,
} from "../helpers/fake-repositories";

/**
 * Service liste de souhaits (P4.5).
 *
 * La différence de fond avec le panier : ajouter deux fois le même produit au
 * panier incrémente une quantité, alors qu'ici il n'y a rien à incrémenter.
 * L'ajout est donc **idempotent**, et le `ConflictError` que remonte la base
 * est absorbé ici plutôt que renvoyé à l'utilisateur.
 */

const USER = "6f3a1c2e-0d4b-4f8a-9c11-2b7d5e8a4f60";

function setup(products = [makeProduct()]) {
  const productRepository = createFakeProductRepository(products);
  const wishlistRepository = createFakeWishlistRepository();
  const cartRepository = createFakeCartRepository();
  const cartService = createCartService({ productRepository, cartRepository });
  const service = createWishlistService({ productRepository, wishlistRepository, cartService });

  return { service, cartService, productRepository, wishlistRepository };
}

describe("add", () => {
  it("ajoute un produit", async () => {
    const product = makeProduct();
    const { service } = setup([product]);

    const result = await service.add(USER, product.id);

    expect(result.added).toBe(true);
    expect(await service.list(USER)).toHaveLength(1);
  });

  it("ajouter deux fois n'est pas une erreur pour l'utilisateur", async () => {
    // Le repository lève un ConflictError sur le doublon. Le service le traite
    // comme « c'est déjà fait », parce que le résultat voulu est atteint.
    const product = makeProduct();
    const { service } = setup([product]);

    await service.add(USER, product.id);
    const second = await service.add(USER, product.id);

    expect(second.added).toBe(false);
    expect(await service.list(USER)).toHaveLength(1);
  });

  it("refuse un produit qui n'existe pas", async () => {
    const { service } = setup();

    await expect(service.add(USER, "prd_000000000000")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("accepte un produit en rupture de stock", async () => {
    // Mettre en favori un produit indisponible est précisément l'usage : on
    // l'attend. Contrairement au panier, la rupture n'est pas bloquante.
    const product = makeProduct({ stock: 0 });
    const { service } = setup([product]);

    await expect(service.add(USER, product.id)).resolves.toMatchObject({ added: true });
  });

  it("refuse au-delà du plafond de la liste", async () => {
    const products = Array.from({ length: MAX_WISHLIST_ITEMS + 1 }, (_, index) =>
      makeProduct({ slug: `produit-${index}` }),
    );
    const { service } = setup(products);

    for (const product of products.slice(0, MAX_WISHLIST_ITEMS)) {
      await service.add(USER, product.id);
    }

    const overflow = products[MAX_WISHLIST_ITEMS];
    await expect(service.add(USER, overflow!.id)).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("list", () => {
  it("joint chaque entrée à son produit et à sa disponibilité", async () => {
    const product = makeProduct({ stock: 2 });
    const { service } = setup([product]);
    await service.add(USER, product.id);

    const entries = await service.list(USER);

    expect(entries[0]?.product.id).toBe(product.id);
    expect(entries[0]?.availability).toBe("low-stock");
  });

  it("ignore une entrée dont le produit a disparu du catalogue", async () => {
    const product = makeProduct();
    const { service, productRepository } = setup([product]);
    await service.add(USER, product.id);

    productRepository.catalogue.delete(product.id);

    await expect(service.list(USER)).resolves.toEqual([]);
  });

  it("présente les ajouts les plus récents en premier", async () => {
    const ancien = makeProduct({ slug: "ancien" });
    const recent = makeProduct({ slug: "recent" });
    const { service } = setup([ancien, recent]);

    await service.add(USER, ancien.id);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.add(USER, recent.id);

    const entries = await service.list(USER);
    expect(entries.map((entry) => entry.product.slug)).toEqual(["recent", "ancien"]);
  });

  it("rend une liste vide sans erreur", async () => {
    const { service } = setup();
    await expect(service.list(USER)).resolves.toEqual([]);
  });
});

describe("toggle", () => {
  it("ajoute quand le produit est absent, retire quand il est présent", async () => {
    const product = makeProduct();
    const { service } = setup([product]);

    expect(await service.toggle(USER, product.id)).toEqual({ inWishlist: true });
    expect(await service.toggle(USER, product.id)).toEqual({ inWishlist: false });
    expect(await service.list(USER)).toEqual([]);
  });

  it("rend l'état réel même quand la présence a été lue en retard", async () => {
    // Une lecture DynamoDB est cohérente à terme, et deux clics rapprochés se
    // croisent. Dans ce cas l'ajout répond « c'était déjà là », ce qui reste un
    // produit **présent** dans la liste : le cœur doit s'afficher rempli.
    const product = makeProduct();
    const { service, wishlistRepository } = setup([product]);
    await service.add(USER, product.id);

    // La présence répond faussement « absent », comme le ferait une réplique
    // en retard.
    wishlistRepository.has = async () => false;

    expect(await service.toggle(USER, product.id)).toEqual({ inWishlist: true });
    expect(await service.list(USER)).toHaveLength(1);
  });

  it("fonctionne quand la méthode est déstructurée du service", async () => {
    // Une Server Action écrit volontiers `const { toggle } = wishlistService`.
    // Une méthode qui s'appuie sur `this` casserait à cet instant, sans que le
    // typage ne dise quoi que ce soit.
    const product = makeProduct();
    const { service } = setup([product]);
    const { toggle } = service;

    await expect(toggle(USER, product.id)).resolves.toEqual({ inWishlist: true });
  });
});

describe("remove", () => {
  it("retire une entrée, et le refaire n'est pas une erreur", async () => {
    const product = makeProduct();
    const { service } = setup([product]);
    await service.add(USER, product.id);

    await service.remove(USER, product.id);
    await expect(service.remove(USER, product.id)).resolves.toBeUndefined();
  });
});

describe("moveToCart", () => {
  it("ajoute au panier et retire de la liste", async () => {
    const product = makeProduct({ stock: 5, priceCents: 3_000 });
    const { service, cartService } = setup([product]);
    await service.add(USER, product.id);

    const summary = await service.moveToCart(USER, product.id);

    expect(summary.lines[0]?.product.id).toBe(product.id);
    expect(summary.subtotalCents).toBe(3_000);
    expect(await service.list(USER)).toEqual([]);
    expect(await cartService.getItemCount(USER)).toBe(1);
  });

  it("conserve l'entrée si l'ajout au panier échoue", async () => {
    // Sans cette garantie, un produit tombé en rupture disparaîtrait de la
    // liste de souhaits sans jamais arriver dans le panier.
    const product = makeProduct({ stock: 0 });
    const { service } = setup([product]);
    await service.add(USER, product.id);

    await expect(service.moveToCart(USER, product.id)).rejects.toBeInstanceOf(ConflictError);
    expect(await service.list(USER)).toHaveLength(1);
  });

  it("refuse de déplacer un produit absent de la liste", async () => {
    const product = makeProduct({ stock: 5 });
    const { service } = setup([product]);

    await expect(service.moveToCart(USER, product.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("has", () => {
  it("répond sans ramener la liste entière", async () => {
    const product = makeProduct();
    const { service } = setup([product]);

    expect(await service.has(USER, product.id)).toBe(false);
    await service.add(USER, product.id);
    expect(await service.has(USER, product.id)).toBe(true);
  });
});
