import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductCard } from "@/components/product/product-card";

import { makeProduct } from "../helpers/factories";

/**
 * Carte produit (P11.6).
 *
 * Les Server Actions sont remplacées : elles atteindraient le réseau, et ce
 * n'est pas ce qui est testé ici. Le reste du composant est le code réel.
 */
vi.mock("@/server/actions/cart", () => ({
  addToCartAction: vi.fn(async () => ({ success: true, data: { adjusted: false } })),
}));
vi.mock("@/server/actions/wishlist", () => ({
  toggleWishlistAction: vi.fn(async () => ({ success: true, data: { inWishlist: true } })),
}));

describe("ProductCard", () => {
  it("affiche la marque, le titre et le prix formaté", () => {
    render(<ProductCard product={makeProduct({ brand: "Sennheiser", priceCents: 54_900 })} />);

    expect(screen.getByText("Sennheiser")).toBeDefined();
    // 549,00 € avec les espaces insécables du format français.
    expect(screen.getByText(/549/)).toBeDefined();
  });

  it("mène à la fiche produit", () => {
    const product = makeProduct({ slug: "hifiman-sundara" });
    render(<ProductCard product={product} />);

    const link = screen.getByRole("link", { name: product.title });
    expect(link.getAttribute("href")).toBe("/products/hifiman-sundara");
  });

  it("ne signale pas la disponibilité quand le produit est en stock", () => {
    // Un badge « En stock » sur chaque carte d'une grille de douze produits
    // n'informe de rien : la disponibilité n'est remarquable que par exception.
    render(<ProductCard product={makeProduct({ stock: 20 })} />);

    expect(screen.queryByText("En stock")).toBeNull();
  });

  it("annonce le stock restant quand il est bas", () => {
    render(<ProductCard product={makeProduct({ stock: 3 })} />);

    expect(screen.getByText("Plus que 3 exemplaires")).toBeDefined();
  });

  it("désactive l'ajout au panier sur un produit en rupture", () => {
    render(<ProductCard product={makeProduct({ stock: 0 })} />);

    expect(screen.getByText("Rupture de stock")).toBeDefined();
    expect(screen.getByRole("button", { name: "Ajouter" }).hasAttribute("disabled")).toBe(true);
  });

  it("décrit le bouton favori par l'action à venir, pas par l'état courant", () => {
    // C'est ce qu'attend quelqu'un qui navigue au lecteur d'écran : le libellé
    // d'un bouton dit ce qu'il fera.
    const product = makeProduct({ title: "Sundara" });
    render(<ProductCard product={product} />);

    expect(screen.getByRole("button", { name: "Ajouter Sundara aux favoris" })).toBeDefined();
  });

  it("donne un texte alternatif à l'image", () => {
    render(<ProductCard product={makeProduct()} />);

    const image = screen.getByRole("img");
    expect(image.getAttribute("alt")).toBeTruthy();
  });
});
