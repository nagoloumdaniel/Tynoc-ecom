import { describe, expect, it } from "vitest";

import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { MAX_CART_LINES, MAX_QUANTITY_PER_LINE } from "@/lib/limits";
import { createCartService } from "@/server/services/cart.service";

import { makeProduct } from "../helpers/factories";
import {
  createFakeCartRepository,
  createFakeProductRepository,
} from "../helpers/fake-repositories";

/**
 * Service panier (P4.1 à P4.4).
 *
 * C'est la logique que le brief évalue en priorité : quantités, anti-doublon,
 * sous-total. Elle est écrite ici, en dehors de tout framework, et se teste
 * sans base de données ni conteneur.
 *
 * Deux propriétés reviennent dans presque tous les tests :
 * le total est **toujours** recalculé côté serveur à partir du prix courant du
 * produit, et la quantité est **toujours** bornée par le stock réel.
 */

const USER = "6f3a1c2e-0d4b-4f8a-9c11-2b7d5e8a4f60";

function setup(products = [makeProduct()]) {
  const productRepository = createFakeProductRepository(products);
  const cartRepository = createFakeCartRepository();
  const service = createCartService({ productRepository, cartRepository });

  return { service, productRepository, cartRepository, products };
}

describe("addItem", () => {
  it("ajoute un produit au panier", async () => {
    const product = makeProduct({ priceCents: 54_900, stock: 10 });
    const { service } = setup([product]);

    const { summary } = await service.addItem(USER, { productId: product.id, quantity: 2 });

    expect(summary.lines).toHaveLength(1);
    expect(summary.lines[0]?.quantity).toBe(2);
    expect(summary.itemCount).toBe(2);
  });

  it("refuse un produit qui n'existe pas", async () => {
    const { service } = setup();

    await expect(
      service.addItem(USER, { productId: "prd_000000000000", quantity: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuse un produit en rupture de stock", async () => {
    const product = makeProduct({ stock: 0 });
    const { service } = setup([product]);

    await expect(
      service.addItem(USER, { productId: product.id, quantity: 1 }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("fusionne avec la ligne existante au lieu de la dupliquer", async () => {
    // Exigence explicite du brief : empêcher les doublons quand c'est
    // pertinent. Pour le panier, cela veut dire incrémenter.
    const product = makeProduct({ stock: 10 });
    const { service } = setup([product]);

    await service.addItem(USER, { productId: product.id, quantity: 2 });
    const { summary } = await service.addItem(USER, { productId: product.id, quantity: 3 });

    expect(summary.lines).toHaveLength(1);
    expect(summary.lines[0]?.quantity).toBe(5);
  });

  it("borne la quantité au stock disponible et le signale", async () => {
    const product = makeProduct({ stock: 3 });
    const { service } = setup([product]);

    const { summary, adjusted } = await service.addItem(USER, {
      productId: product.id,
      quantity: 8,
    });

    expect(summary.lines[0]?.quantity).toBe(3);
    // L'ajustement est remonté à l'appelant : sans cela, l'interface ne peut
    // pas expliquer pourquoi la quantité n'est pas celle demandée.
    expect(adjusted).toBe(true);
  });

  it("borne aussi la fusion au stock disponible", async () => {
    const product = makeProduct({ stock: 4 });
    const { service } = setup([product]);

    await service.addItem(USER, { productId: product.id, quantity: 3 });
    const { summary, adjusted } = await service.addItem(USER, {
      productId: product.id,
      quantity: 5,
    });

    expect(summary.lines[0]?.quantity).toBe(4);
    expect(adjusted).toBe(true);
  });

  it("borne la quantité au plafond métier même quand le stock est abondant", async () => {
    const product = makeProduct({ stock: 500 });
    const { service } = setup([product]);

    const { summary, adjusted } = await service.addItem(USER, {
      productId: product.id,
      quantity: 400,
    });

    expect(summary.lines[0]?.quantity).toBe(MAX_QUANTITY_PER_LINE);
    expect(adjusted).toBe(true);
  });

  it("refuse d'ajouter quand la ligne est déjà au maximum possible", async () => {
    const product = makeProduct({ stock: 3 });
    const { service } = setup([product]);
    await service.addItem(USER, { productId: product.id, quantity: 3 });

    // Ajouter sans rien pouvoir ajouter n'est pas un succès silencieux :
    // l'utilisateur doit comprendre que son clic n'a rien fait.
    await expect(
      service.addItem(USER, { productId: product.id, quantity: 1 }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("refuse d'ouvrir une ligne de plus au-delà du plafond du panier", async () => {
    // `MAX_CART_LINES` existe comme garde-fou d'abus et de coût : sans lecteur,
    // un script pouvait ouvrir autant de lignes qu'il voulait.
    const products = Array.from({ length: MAX_CART_LINES + 1 }, (_, index) =>
      makeProduct({ slug: `article-${index}`, stock: 5 }),
    );
    const { service } = setup(products);

    for (const product of products.slice(0, MAX_CART_LINES)) {
      await service.addItem(USER, { productId: product.id, quantity: 1 });
    }

    await expect(
      service.addItem(USER, { productId: products[MAX_CART_LINES]!.id, quantity: 1 }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("laisse incrémenter une ligne existante même quand le panier est plein", async () => {
    // Le plafond porte sur le nombre de lignes, pas sur les quantités : un
    // panier plein doit rester modifiable.
    const products = Array.from({ length: MAX_CART_LINES }, (_, index) =>
      makeProduct({ slug: `plein-${index}`, stock: 5 }),
    );
    const { service } = setup(products);

    for (const product of products) {
      await service.addItem(USER, { productId: product.id, quantity: 1 });
    }

    await expect(
      service.addItem(USER, { productId: products[0]!.id, quantity: 1 }),
    ).resolves.toMatchObject({ adjusted: false });
  });

  it("ne signale aucun ajustement quand la demande est servie telle quelle", async () => {
    const product = makeProduct({ stock: 10 });
    const { service } = setup([product]);

    const { adjusted } = await service.addItem(USER, { productId: product.id, quantity: 2 });

    expect(adjusted).toBe(false);
  });
});

describe("sous-total", () => {
  it("calcule en centimes entiers, jamais en flottants", async () => {
    // 19,99 × 3 doit donner exactement 59,97. En flottants, 19.99 * 3 vaut
    // 59.96999999999999.
    const product = makeProduct({ priceCents: 1_999, stock: 10 });
    const { service } = setup([product]);

    const { summary } = await service.addItem(USER, { productId: product.id, quantity: 3 });

    expect(summary.subtotalCents).toBe(5_997);
    expect(Number.isInteger(summary.subtotalCents)).toBe(true);
  });

  it("additionne plusieurs lignes", async () => {
    const casque = makeProduct({ slug: "casque", priceCents: 54_900, stock: 5 });
    const cable = makeProduct({ slug: "cable", priceCents: 6_900, stock: 5 });
    const { service } = setup([casque, cable]);

    await service.addItem(USER, { productId: casque.id, quantity: 2 });
    const { summary } = await service.addItem(USER, { productId: cable.id, quantity: 3 });

    expect(summary.subtotalCents).toBe(54_900 * 2 + 6_900 * 3);
    expect(summary.itemCount).toBe(5);
  });

  it("utilise le prix courant du produit, pas un prix figé à l'ajout", async () => {
    // Un prix recopié dans la ligne deviendrait faux à la première mise à jour
    // du catalogue. Le service relit toujours le produit.
    const product = makeProduct({ priceCents: 10_000, stock: 5 });
    const { service, productRepository } = setup([product]);

    await service.addItem(USER, { productId: product.id, quantity: 2 });
    productRepository.catalogue.set(product.id, { ...product, priceCents: 12_000 });

    const summary = await service.getSummary(USER);
    expect(summary.subtotalCents).toBe(24_000);
  });

  it("rend un panier vide sans erreur", async () => {
    const { service } = setup();

    const summary = await service.getSummary(USER);

    expect(summary).toMatchObject({
      lines: [],
      itemCount: 0,
      subtotalCents: 0,
      orphanProductIds: [],
    });
  });
});

describe("jointure avec le catalogue", () => {
  it("signale une ligne dont le produit a disparu, sans planter", async () => {
    const product = makeProduct({ priceCents: 5_000, stock: 5 });
    const { service, productRepository } = setup([product]);
    await service.addItem(USER, { productId: product.id, quantity: 2 });

    productRepository.catalogue.delete(product.id);

    const summary = await service.getSummary(USER);

    expect(summary.lines).toHaveLength(0);
    expect(summary.orphanProductIds).toEqual([product.id]);
    // Une ligne orpheline n'a plus de prix : elle ne peut pas compter dans le
    // total, mais elle ne doit pas non plus le faire échouer.
    expect(summary.subtotalCents).toBe(0);
  });

  it("garde les lignes valides à côté d'une ligne orpheline", async () => {
    const vivant = makeProduct({ slug: "vivant", priceCents: 5_000, stock: 5 });
    const disparu = makeProduct({ slug: "disparu", priceCents: 9_000, stock: 5 });
    const { service, productRepository } = setup([vivant, disparu]);

    await service.addItem(USER, { productId: vivant.id, quantity: 2 });
    await service.addItem(USER, { productId: disparu.id, quantity: 1 });
    productRepository.catalogue.delete(disparu.id);

    const summary = await service.getSummary(USER);

    expect(summary.lines).toHaveLength(1);
    expect(summary.subtotalCents).toBe(10_000);
    expect(summary.orphanProductIds).toEqual([disparu.id]);
  });

  it("signale une ligne dont la quantité dépasse le stock devenu insuffisant", async () => {
    const product = makeProduct({ stock: 10, priceCents: 1_000 });
    const { service, productRepository } = setup([product]);
    await service.addItem(USER, { productId: product.id, quantity: 6 });

    productRepository.catalogue.set(product.id, { ...product, stock: 2 });

    const summary = await service.getSummary(USER);

    expect(summary.lines[0]?.exceedsStock).toBe(true);
    expect(summary.lines[0]?.availability).toBe("low-stock");
  });

  it("expose la disponibilité de chaque ligne", async () => {
    const product = makeProduct({ stock: 10 });
    const { service } = setup([product]);
    await service.addItem(USER, { productId: product.id, quantity: 1 });

    const summary = await service.getSummary(USER);

    expect(summary.lines[0]?.availability).toBe("in-stock");
    expect(summary.lines[0]?.exceedsStock).toBe(false);
  });

  it("ordonne les lignes par date d'ajout, de la plus ancienne à la plus récente", async () => {
    // Un ordre instable ferait sauter les lignes d'un rendu à l'autre.
    const premier = makeProduct({ slug: "premier", stock: 5 });
    const second = makeProduct({ slug: "second", stock: 5 });
    const { service } = setup([premier, second]);

    await service.addItem(USER, { productId: premier.id, quantity: 1 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.addItem(USER, { productId: second.id, quantity: 1 });

    const summary = await service.getSummary(USER);
    expect(summary.lines.map((line) => line.product.slug)).toEqual(["premier", "second"]);
  });

  it("calcule le total de chaque ligne", async () => {
    const product = makeProduct({ priceCents: 2_500, stock: 10 });
    const { service } = setup([product]);

    const { summary } = await service.addItem(USER, { productId: product.id, quantity: 4 });

    expect(summary.lines[0]?.lineTotalCents).toBe(10_000);
  });
});

describe("setQuantity", () => {
  it("fixe une quantité absolue", async () => {
    const product = makeProduct({ stock: 10 });
    const { service } = setup([product]);
    await service.addItem(USER, { productId: product.id, quantity: 2 });

    const { summary } = await service.setQuantity(USER, { productId: product.id, quantity: 7 });

    expect(summary.lines[0]?.quantity).toBe(7);
  });

  it("borne la quantité au stock et le signale", async () => {
    const product = makeProduct({ stock: 3 });
    const { service } = setup([product]);
    await service.addItem(USER, { productId: product.id, quantity: 1 });

    const { summary, adjusted } = await service.setQuantity(USER, {
      productId: product.id,
      quantity: 9,
    });

    expect(summary.lines[0]?.quantity).toBe(3);
    expect(adjusted).toBe(true);
  });

  it("refuse de modifier une ligne absente du panier", async () => {
    const product = makeProduct();
    const { service } = setup([product]);

    await expect(
      service.setQuantity(USER, { productId: product.id, quantity: 2 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuse une quantité nulle ou négative au lieu de la persister", async () => {
    // Une quantité de zéro passait la borne haute et atteignait la base. Le
    // mapper la rejetait ensuite comme corrompue, et **toute lecture
    // ultérieure du panier** échouait : le panier devenait inutilisable
    // jusqu'à l'expiration du TTL.
    const product = makeProduct({ stock: 5 });
    const { service } = setup([product]);
    await service.addItem(USER, { productId: product.id, quantity: 2 });

    await expect(
      service.setQuantity(USER, { productId: product.id, quantity: 0 }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      service.setQuantity(USER, { productId: product.id, quantity: -4 }),
    ).rejects.toBeInstanceOf(ValidationError);

    // La ligne d'origine est intacte et le panier reste lisible.
    const summary = await service.getSummary(USER);
    expect(summary.lines[0]?.quantity).toBe(2);
  });

  it("refuse de fixer une quantité sur un produit tombé en rupture", async () => {
    const product = makeProduct({ stock: 5 });
    const { service, productRepository } = setup([product]);
    await service.addItem(USER, { productId: product.id, quantity: 2 });

    productRepository.catalogue.set(product.id, { ...product, stock: 0 });

    await expect(
      service.setQuantity(USER, { productId: product.id, quantity: 1 }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("removeItem et clear", () => {
  it("retire une ligne", async () => {
    const product = makeProduct({ stock: 5 });
    const { service } = setup([product]);
    await service.addItem(USER, { productId: product.id, quantity: 2 });

    const summary = await service.removeItem(USER, product.id);

    expect(summary.lines).toEqual([]);
    expect(summary.subtotalCents).toBe(0);
  });

  it("retirer une ligne absente n'est pas une erreur", async () => {
    const { service } = setup();

    await expect(service.removeItem(USER, "prd_000000000000")).resolves.toMatchObject({
      lines: [],
    });
  });

  it("vide le panier", async () => {
    const un = makeProduct({ slug: "un", stock: 5 });
    const deux = makeProduct({ slug: "deux", stock: 5 });
    const { service } = setup([un, deux]);
    await service.addItem(USER, { productId: un.id, quantity: 1 });
    await service.addItem(USER, { productId: deux.id, quantity: 1 });

    const summary = await service.clear(USER);

    expect(summary.itemCount).toBe(0);
  });
});

describe("getItemCount", () => {
  it("compte les articles et non les lignes", async () => {
    // Le compteur de l'en-tête affiche des articles : trois exemplaires d'un
    // même casque font trois, pas un.
    const un = makeProduct({ slug: "un", stock: 5 });
    const deux = makeProduct({ slug: "deux", stock: 5 });
    const { service } = setup([un, deux]);

    await service.addItem(USER, { productId: un.id, quantity: 3 });
    await service.addItem(USER, { productId: deux.id, quantity: 2 });

    expect(await service.getItemCount(USER)).toBe(5);
  });

  it("compte zéro sur un panier vide", async () => {
    const { service } = setup();
    expect(await service.getItemCount(USER)).toBe(0);
  });

  it("compte sans lire le catalogue", async () => {
    // Le compteur s'affiche sur toutes les pages : le faire passer par la
    // jointure avec les produits serait une lecture inutile à chaque rendu.
    const product = makeProduct({ stock: 5 });
    const { service, productRepository } = setup([product]);
    await service.addItem(USER, { productId: product.id, quantity: 2 });

    productRepository.catalogue.clear();

    expect(await service.getItemCount(USER)).toBe(2);
  });
});
