import { describe, expect, it } from "vitest";

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/limits";
import { ValidationError } from "@/lib/errors";
import { productIdFromSlug } from "@/lib/ids";
import { categoryRepository } from "@/server/repositories/category.repository";
import { productRepository } from "@/server/repositories/product.repository";

/**
 * Repository produit (P3.1) et catégorie (P3.2), contre DynamoDB Local (P3.9).
 *
 * Prérequis : `npm run db:up`, `npm run db:create-table`, `npm run db:seed`.
 *
 * Ce que ces tests vérifient, et que des tests unitaires à base de doublures ne
 * pourraient pas vérifier : que les clés, les index et les conditions écrits
 * dans le repository correspondent à ceux réellement créés sur la table.
 */

const SLUG = "sennheiser-hd-660s2";
const ID = productIdFromSlug(SLUG);

describe("productRepository.findById", () => {
  it("retourne une entité du domaine, jamais un item brut", async () => {
    const product = await productRepository.findById(ID);

    expect(product?.slug).toBe(SLUG);
    expect(product).not.toHaveProperty("PK");
    expect(product).not.toHaveProperty("GSI1SK");
  });

  it("retourne null pour un identifiant inconnu", async () => {
    // Le repository ne décide pas qu'une absence est une erreur : c'est au
    // service de choisir entre un 404 et une liste vide.
    await expect(productRepository.findById("prd_000000000000")).resolves.toBeNull();
  });
});

describe("productRepository.findBySlug", () => {
  it("résout un slug d'URL", async () => {
    const product = await productRepository.findBySlug(SLUG);

    expect(product?.id).toBe(ID);
    expect(product?.title).toBe("HD 660S2");
  });

  it("retourne null pour un slug inconnu", async () => {
    await expect(productRepository.findBySlug("casque-imaginaire")).resolves.toBeNull();
  });
});

describe("productRepository.findAll", () => {
  it("ramène le catalogue complet", async () => {
    const products = await productRepository.findAll();

    expect(products).toHaveLength(47);
  });

  it("ne dépend pas de la taille de page interne", async () => {
    // La lecture suit la LastEvaluatedKey jusqu'au bout. Avec une page de 10,
    // un repository qui oublie de boucler renverrait 10 produits.
    const products = await productRepository.findAll({ pageSize: 10 });

    expect(products).toHaveLength(47);
  });
});

describe("productRepository.findByCategory", () => {
  it("retourne les produits d'une catégorie, triés par prix croissant", async () => {
    const products = await productRepository.findByCategory("casques");

    expect(products.length).toBeGreaterThan(5);
    expect(products.every((product) => product.categorySlug === "casques")).toBe(true);

    const prices = products.map((product) => product.priceCents);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("retourne une liste vide pour une catégorie sans produit", async () => {
    await expect(productRepository.findByCategory("categorie-vide")).resolves.toEqual([]);
  });
});

describe("productRepository.findPage", () => {
  it("applique la taille de page par défaut", async () => {
    const page = await productRepository.findPage();

    expect(page.items).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(page.nextCursor).toBeTypeOf("string");
  });

  it("parcourt tout le catalogue de curseur en curseur, sans doublon ni oubli", async () => {
    const seen: string[] = [];
    let cursor: string | undefined;

    do {
      const page = await productRepository.findPage({ limit: 20, cursor });
      seen.push(...page.items.map((product) => product.id));
      cursor = page.nextCursor;
    } while (cursor);

    expect(seen).toHaveLength(47);
    expect(new Set(seen).size).toBe(47);
  });

  it("ne renvoie pas de curseur sur la dernière page", async () => {
    const page = await productRepository.findPage({ limit: MAX_PAGE_SIZE });

    expect(page.items).toHaveLength(47);
    expect(page.nextCursor).toBeUndefined();
  });

  it("plafonne une taille de page hostile", async () => {
    // Sans plafond, `?limit=100000` fait payer une lecture complète à chaque
    // requête (P15.20).
    const page = await productRepository.findPage({ limit: 10_000 });

    expect(page.items.length).toBeLessThanOrEqual(MAX_PAGE_SIZE);
  });

  it("restreint la page à une catégorie", async () => {
    const page = await productRepository.findPage({ categorySlug: "microphones", limit: 50 });

    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((product) => product.categorySlug === "microphones")).toBe(true);
  });

  it("rejette un curseur fabriqué à la main", async () => {
    await expect(productRepository.findPage({ cursor: "n-importe-quoi" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("productRepository.findManyByIds", () => {
  it("lit plusieurs produits en une fois", async () => {
    // Le panier joint ses lignes aux produits. Une lecture par ligne serait
    // exactement le problème N+1.
    const ids = [ID, productIdFromSlug("hifiman-sundara"), productIdFromSlug("schiit-sys")];
    const products = await productRepository.findManyByIds(ids);

    expect(products.map((product) => product.id).sort()).toEqual([...ids].sort());
  });

  it("ignore silencieusement un identifiant inconnu", async () => {
    // Un produit supprimé du catalogue laisse une ligne de panier orpheline.
    // C'est au service de la signaler, pas au repository d'échouer.
    const products = await productRepository.findManyByIds([ID, "prd_000000000000"]);

    expect(products).toHaveLength(1);
  });

  it("retourne une liste vide sans appeler la base", async () => {
    await expect(productRepository.findManyByIds([])).resolves.toEqual([]);
  });

  it("dédoublonne les identifiants demandés", async () => {
    // BatchGetItem refuse deux fois la même clé dans un même appel.
    const products = await productRepository.findManyByIds([ID, ID, ID]);

    expect(products).toHaveLength(1);
  });
});

describe("categoryRepository", () => {
  it("retourne les catégories dans l'ordre voulu par le marchand", async () => {
    const categories = await categoryRepository.findAll();

    expect(categories).toHaveLength(8);

    const positions = categories.map((category) => category.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(categories[0]?.slug).toBe("casques");
  });

  it("résout une catégorie par son slug", async () => {
    const category = await categoryRepository.findBySlug("microphones");

    expect(category?.name).toBe("Microphones");
    expect(category).not.toHaveProperty("SK");
  });

  it("retourne null pour une catégorie inconnue", async () => {
    await expect(categoryRepository.findBySlug("categorie-imaginaire")).resolves.toBeNull();
  });
});
