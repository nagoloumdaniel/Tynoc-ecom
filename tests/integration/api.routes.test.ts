import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { productIdFromSlug } from "@/lib/ids";
import { MAX_QUANTITY_PER_LINE } from "@/lib/limits";

/**
 * Routes HTTP (P5.12), contre DynamoDB Local.
 *
 * Prérequis : `npm run db:up`, `npm run db:create-table`, `npm run db:seed`.
 *
 * Les routes sont appelées directement, comme des fonctions, avec une vraie
 * `Request`. Le seul élément remplacé est `next/headers` : `cookies()` exige un
 * contexte de requête Next que ces tests n'ont pas. Tout le reste, services et
 * base compris, est le code réel.
 *
 * Ce que ces tests vérifient et que les tests unitaires ne peuvent pas : que
 * l'enveloppe, les statuts et la dérivation d'identité tiennent bout à bout.
 */

const SESSION_USER = randomUUID();
const OTHER_USER = randomUUID();

let currentUser = SESSION_USER;

// `cookies()` n'est pas disponible hors requête Next. On rend la session
// pilotable par le test, ce qui permet justement de vérifier l'isolation.
//
// Fabrique asynchrone : `vi.mock` est hissé au-dessus des imports, donc la
// signature ne peut être chargée que par un `import()` dynamique à l'intérieur.
vi.mock("next/headers", async () => {
  const { signSession } = await import("@/lib/session");

  return {
    cookies: async () => ({
      get: (name: string) =>
        name.includes("tynoc_session")
          ? { name, value: signSession(process.env["SESSION_SECRET"] ?? "", currentUser) }
          : undefined,
    }),
  };
});

// `revalidatePath` n'a pas de contexte de rendu ici.
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const PRODUCT_SLUG = "sennheiser-hd-660s2";
const PRODUCT_ID = productIdFromSlug(PRODUCT_SLUG);

function get(url: string): NextRequest {
  return new NextRequest(new Request(url));
}

function jsonRequest(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(
    new Request(url, {
      method,
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );
}

let routes: {
  products: typeof import("@/app/api/products/route");
  product: typeof import("@/app/api/products/[slug]/route");
  categories: typeof import("@/app/api/categories/route");
  cart: typeof import("@/app/api/cart/route");
  wishlist: typeof import("@/app/api/wishlist/route");
};

beforeAll(async () => {
  routes = {
    products: await import("@/app/api/products/route"),
    product: await import("@/app/api/products/[slug]/route"),
    categories: await import("@/app/api/categories/route"),
    cart: await import("@/app/api/cart/route"),
    wishlist: await import("@/app/api/wishlist/route"),
  };
});

afterAll(async () => {
  const { userRepository } = await import("@/server/repositories/user.repository");
  await userRepository.deleteAll(SESSION_USER);
  await userRepository.deleteAll(OTHER_USER);
});

describe("GET /api/products", () => {
  it("répond dans l'enveloppe commune", async () => {
    const response = await routes.products.GET(get("https://tynoc.test/api/products"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(47);
  });

  it("applique recherche et filtres", async () => {
    const response = await routes.products.GET(
      get("https://tynoc.test/api/products?category=microphones&inStock=true"),
    );
    const body = await response.json();

    expect(body.data.items.every((p: { stock: number }) => p.stock > 0)).toBe(true);
  });

  it("refuse un paramètre invalide par un 400 explicite", async () => {
    const response = await routes.products.GET(get("https://tynoc.test/api/products?page=zero"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ success: false, error: { code: "VALIDATION" } });
    expect(body.error.requestId).toBeTypeOf("string");
  });

  it("refuse un paramètre inconnu plutôt que de l'ignorer", async () => {
    const response = await routes.products.GET(
      get("https://tynoc.test/api/products?userId=autrui"),
    );

    expect(response.status).toBe(400);
  });

  it("refuse une taille de page déraisonnable", async () => {
    const response = await routes.products.GET(
      get("https://tynoc.test/api/products?pageSize=100000"),
    );

    expect(response.status).toBe(400);
  });
});

describe("GET /api/products/[slug]", () => {
  it("retourne le produit", async () => {
    const response = await routes.product.GET(
      get(`https://tynoc.test/api/products/${PRODUCT_SLUG}`),
      { params: Promise.resolve({ slug: PRODUCT_SLUG }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.slug).toBe(PRODUCT_SLUG);
  });

  it("répond 404 structuré sur un slug inconnu", async () => {
    const response = await routes.product.GET(get("https://tynoc.test/api/products/inconnu"), {
      params: Promise.resolve({ slug: "inconnu" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toMatchObject({ success: false, error: { code: "NOT_FOUND" } });
  });
});

describe("GET /api/categories", () => {
  it("retourne les catégories comptées et ordonnées", async () => {
    const response = await routes.categories.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(8);
    expect(body.data[0].slug).toBe("casques");
    expect(body.data[0].productCount).toBeGreaterThan(0);
  });
});

describe("/api/cart", () => {
  it("ajoute un article et renvoie le récapitulatif", async () => {
    const response = await routes.cart.POST(
      jsonRequest("https://tynoc.test/api/cart", "POST", { productId: PRODUCT_ID, quantity: 2 }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.itemCount).toBe(2);
    expect(body.data.subtotalCents).toBe(54_900 * 2);
    expect(body.data.adjusted).toBe(false);
  });

  it("fusionne au lieu de créer un doublon", async () => {
    await routes.cart.POST(
      jsonRequest("https://tynoc.test/api/cart", "POST", { productId: PRODUCT_ID, quantity: 1 }),
    );

    const response = await routes.cart.GET();
    const body = await response.json();

    expect(body.data.lines).toHaveLength(1);
    expect(body.data.itemCount).toBe(3);
  });

  it("refuse un identifiant d'utilisateur glissé dans le corps", async () => {
    // Le cœur de l'anti-IDOR : le champ n'est pas ignoré, il fait échouer la
    // requête. Impossible d'écrire dans le panier d'autrui (P15.1).
    const response = await routes.cart.POST(
      jsonRequest("https://tynoc.test/api/cart", "POST", {
        productId: PRODUCT_ID,
        quantity: 1,
        userId: OTHER_USER,
      }),
    );

    expect(response.status).toBe(400);
  });

  it("n'expose jamais le panier d'une autre session", async () => {
    currentUser = OTHER_USER;
    const response = await routes.cart.GET();
    const body = await response.json();
    currentUser = SESSION_USER;

    expect(body.data.lines).toEqual([]);
  });

  it("fixe une quantité", async () => {
    const response = await routes.cart.PATCH(
      jsonRequest("https://tynoc.test/api/cart", "PATCH", { productId: PRODUCT_ID, quantity: 5 }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.itemCount).toBe(5);
  });

  it("refuse une quantité au-delà du plafond", async () => {
    const response = await routes.cart.PATCH(
      jsonRequest("https://tynoc.test/api/cart", "PATCH", {
        productId: PRODUCT_ID,
        quantity: MAX_QUANTITY_PER_LINE + 1,
      }),
    );

    expect(response.status).toBe(400);
  });

  it("retire une ligne", async () => {
    const response = await routes.cart.DELETE(
      get(`https://tynoc.test/api/cart?productId=${PRODUCT_ID}`),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.lines).toEqual([]);
  });

  it("vide le panier sans contenu de réponse", async () => {
    await routes.cart.POST(
      jsonRequest("https://tynoc.test/api/cart", "POST", { productId: PRODUCT_ID, quantity: 1 }),
    );

    const response = await routes.cart.DELETE(get("https://tynoc.test/api/cart"));

    expect(response.status).toBe(204);
  });
});

describe("/api/wishlist", () => {
  it("ajoute une entrée en 201", async () => {
    const response = await routes.wishlist.POST(
      jsonRequest("https://tynoc.test/api/wishlist", "POST", { productId: PRODUCT_ID }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.added).toBe(true);
  });

  it("répond 200 et added false sur un second ajout, pas 409", async () => {
    // L'ajout est idempotent : mettre deux fois un produit en favori n'est pas
    // une erreur pour l'utilisateur, donc pas un échec HTTP.
    const response = await routes.wishlist.POST(
      jsonRequest("https://tynoc.test/api/wishlist", "POST", { productId: PRODUCT_ID }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.added).toBe(false);
    expect(body.data.items).toHaveLength(1);
  });

  it("refuse un produit inexistant", async () => {
    const response = await routes.wishlist.POST(
      jsonRequest("https://tynoc.test/api/wishlist", "POST", { productId: "prd_000000000000" }),
    );

    expect(response.status).toBe(404);
  });

  it("retire une entrée", async () => {
    const response = await routes.wishlist.DELETE(
      get(`https://tynoc.test/api/wishlist?productId=${PRODUCT_ID}`),
    );

    expect(response.status).toBe(204);
    const list = await (await routes.wishlist.GET()).json();
    expect(list.data).toEqual([]);
  });

  it("exige le produit à retirer", async () => {
    const response = await routes.wishlist.DELETE(get("https://tynoc.test/api/wishlist"));

    expect(response.status).toBe(400);
  });
});
