import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EmptyState, ErrorState, ProductGridSkeleton } from "@/components/feedback/states";

/**
 * États vides, d'erreur et de chargement (P11.6).
 *
 * Ce qui est vérifié ici n'est pas l'apparence mais les règles du projet : un
 * état vide propose toujours une sortie, une erreur dit quoi faire et
 * s'annonce, un squelette ne bavarde pas.
 */

describe("EmptyState", () => {
  it("propose une sortie concrète", () => {
    // Règle de P1.9 : un état vide est une invitation, pas un constat. Sans
    // action, l'écran est un cul-de-sac.
    render(
      <EmptyState
        title="Votre panier est vide."
        description="Parcourez le catalogue."
        action={{ label: "Parcourir le catalogue", href: "/products" }}
      />,
    );

    const link = screen.getByRole("link", { name: "Parcourir le catalogue" });
    expect(link.getAttribute("href")).toBe("/products");
  });

  it("porte un titre de niveau, pas un simple paragraphe", () => {
    render(<EmptyState title="Aucun favori pour l'instant." description="Le cœur met de côté." />);

    expect(screen.getByRole("heading", { name: "Aucun favori pour l'instant." })).toBeDefined();
  });

  it("reste utilisable sans action", () => {
    render(<EmptyState title="Rien ici." description="Pour le moment." />);

    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("ErrorState", () => {
  it("s'annonce dès son apparition", () => {
    // `role="alert"` : l'utilisateur n'a pas à partir à la recherche du
    // message.
    render(<ErrorState title="Le catalogue est injoignable." description="Réessayez." />);

    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("propose de réessayer quand une reprise est possible", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();

    render(<ErrorState title="Panne." description="Réessayez dans un instant." onRetry={retry} />);

    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("n'affiche pas de bouton quand aucune reprise n'est offerte", () => {
    render(<ErrorState title="Panne." description="Revenez plus tard." />);

    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("ProductGridSkeleton", () => {
  it("annonce le chargement une seule fois pour toute la région", () => {
    // Une annonce par rectangle produirait douze annonces pour une grille de
    // douze produits.
    render(<ProductGridSkeleton count={12} />);

    const regions = screen.getAllByRole("status");
    expect(regions).toHaveLength(1);
    expect(regions[0]?.getAttribute("aria-label")).toBe("Chargement des produits");
  });

  it("rend autant de silhouettes que demandé", () => {
    const { container } = render(<ProductGridSkeleton count={4} />);

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(4);
  });
});
