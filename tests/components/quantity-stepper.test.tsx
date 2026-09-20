import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuantityStepper } from "@/components/cart/quantity-stepper";

const setCartQuantityAction = vi.fn(async () => ({
  success: true as const,
  data: { adjusted: false },
}));

vi.mock("@/server/actions/cart", () => ({
  setCartQuantityAction: (...args: unknown[]) => setCartQuantityAction(...(args as [])),
}));

/**
 * Sélecteur de quantité (P11.6).
 *
 * Le composant le plus à risque du projet, parce que son comportement tient à
 * un minuteur : la quantité affichée change tout de suite, l'envoi au serveur
 * est différé. Un test qui vérifierait seulement l'affichage passerait alors
 * même que le composant enverrait une requête par clic.
 */
describe("QuantityStepper", () => {
  beforeEach(() => {
    setCartQuantityAction.mockClear();
  });

  it("affiche la quantité reçue", () => {
    render(<QuantityStepper productId="prd_a1b2c3d4e5f6" quantity={3} max={10} />);

    expect(screen.getByLabelText("Quantité").getAttribute("value")).toBe("3");
  });

  it("met à jour l'affichage immédiatement au clic", async () => {
    const user = userEvent.setup();
    render(<QuantityStepper productId="prd_a1b2c3d4e5f6" quantity={2} max={10} />);

    await user.click(screen.getByLabelText("Augmenter la quantité"));

    expect(screen.getByLabelText("Quantité").getAttribute("value")).toBe("3");
  });

  it("n'envoie qu'une seule requête pour une rafale de clics", async () => {
    // Le point essentiel : cinq clics rapides ne doivent produire qu'un appel,
    // avec la valeur finale. Sans cela, un utilisateur pressé déclenche cinq
    // écritures dont quatre sont aussitôt périmées.
    const user = userEvent.setup();
    render(<QuantityStepper productId="prd_a1b2c3d4e5f6" quantity={1} max={10} />);

    const plus = screen.getByLabelText("Augmenter la quantité");
    for (let index = 0; index < 5; index += 1) await user.click(plus);

    expect(screen.getByLabelText("Quantité").getAttribute("value")).toBe("6");

    await waitFor(() => expect(setCartQuantityAction).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(setCartQuantityAction).toHaveBeenCalledWith({
      productId: "prd_a1b2c3d4e5f6",
      quantity: 6,
    });
  });

  it("bloque au plancher de 1", async () => {
    // Descendre à zéro serait un retrait, qui est une autre action avec sa
    // propre confirmation et son annulation.
    const user = userEvent.setup();
    render(<QuantityStepper productId="prd_a1b2c3d4e5f6" quantity={1} max={10} />);

    const minus = screen.getByLabelText("Diminuer la quantité");
    expect(minus.hasAttribute("disabled")).toBe(true);

    await user.click(minus);
    expect(screen.getByLabelText("Quantité").getAttribute("value")).toBe("1");
  });

  it("plafonne au stock disponible, pas au plafond métier", async () => {
    const user = userEvent.setup();
    render(<QuantityStepper productId="prd_a1b2c3d4e5f6" quantity={3} max={3} />);

    expect(screen.getByLabelText("Augmenter la quantité").hasAttribute("disabled")).toBe(true);
    await user.click(screen.getByLabelText("Augmenter la quantité"));

    expect(screen.getByLabelText("Quantité").getAttribute("value")).toBe("3");
  });

  it("accepte une saisie directe validée à la sortie du champ", async () => {
    const user = userEvent.setup();
    render(<QuantityStepper productId="prd_a1b2c3d4e5f6" quantity={1} max={10} />);

    const field = screen.getByLabelText("Quantité");
    await user.clear(field);
    await user.type(field, "7");
    await user.tab();

    await waitFor(() => expect(setCartQuantityAction).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(setCartQuantityAction).toHaveBeenCalledWith({
      productId: "prd_a1b2c3d4e5f6",
      quantity: 7,
    });
  });

  it("n'envoie rien pendant la frappe", async () => {
    // Taper « 12 » passe par « 1 » : envoyer cet état intermédiaire écrirait
    // une valeur fausse avant la bonne.
    const user = userEvent.setup();
    render(<QuantityStepper productId="prd_a1b2c3d4e5f6" quantity={1} max={10} />);

    const field = screen.getByLabelText("Quantité");
    await user.clear(field);
    await user.type(field, "10");

    expect(setCartQuantityAction).not.toHaveBeenCalled();
  });

  it("ramène une saisie au-delà du stock dans les bornes", async () => {
    const user = userEvent.setup();
    render(<QuantityStepper productId="prd_a1b2c3d4e5f6" quantity={1} max={4} />);

    const field = screen.getByLabelText("Quantité");
    await user.clear(field);
    await user.type(field, "99");
    await user.tab();

    await waitFor(() => expect(setCartQuantityAction).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(setCartQuantityAction).toHaveBeenCalledWith({
      productId: "prd_a1b2c3d4e5f6",
      quantity: 4,
    });
  });

  it("revient à la valeur courante si le champ est vidé puis quitté", async () => {
    const user = userEvent.setup();
    render(<QuantityStepper productId="prd_a1b2c3d4e5f6" quantity={5} max={10} />);

    const field = screen.getByLabelText("Quantité");
    await user.clear(field);
    await user.tab();

    expect(screen.getByLabelText("Quantité").getAttribute("value")).toBe("5");
    expect(setCartQuantityAction).not.toHaveBeenCalled();
  });
});
