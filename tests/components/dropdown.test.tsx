import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown } from "@/components/ui/dropdown";

/**
 * Menu déroulant personnalisé.
 *
 * Remplacer le `<select>` natif n'est acceptable que si tout ce qu'il offrait
 * gratuitement est refait. Ces tests en sont la liste : clavier, recherche par
 * frappe, lecteur d'écran, formulaire.
 */

const OPTIONS = [
  { value: "", label: "Toutes" },
  { value: "casques", label: "Casques" },
  { value: "ecouteurs", label: "Écouteurs" },
  { value: "convertisseurs", label: "Convertisseurs" },
  { value: "cables", label: "Câblage" },
];

/** Libellé de l'option annoncée par `aria-activedescendant`. */
function activeLabel(trigger: HTMLElement): string {
  const id = trigger.getAttribute("aria-activedescendant");
  return (id && document.getElementById(id)?.textContent) || "";
}

function setup(onValueChange = vi.fn()) {
  render(
    <form aria-label="filtres">
      <span id="label">Catégorie</span>
      <Dropdown
        id="category"
        name="category"
        aria-labelledby="label"
        options={OPTIONS}
        defaultValue="casques"
        onValueChange={onValueChange}
      />
    </form>,
  );

  const trigger = screen.getByRole("combobox", { name: "Catégorie" });
  const form = screen.getByRole("form", { name: "filtres" }) as HTMLFormElement;
  const formValue = () => new FormData(form).get("category");

  return { trigger, formValue, onValueChange, user: userEvent.setup() };
}

describe("Dropdown", () => {
  it("affiche la valeur initiale et la porte dans le formulaire", () => {
    const { trigger, formValue } = setup();

    expect(trigger?.textContent).toContain("Casques");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(formValue()).toBe("casques");
  });

  it("s'ouvre au clic et marque l'option sélectionnée", async () => {
    const { trigger, user } = setup();

    await user.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("option", { name: "Casques" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("sélectionne une option à la souris", async () => {
    const { trigger, formValue, onValueChange, user } = setup();

    await user.click(trigger);
    await user.pointer({
      keys: "[MouseLeft>]",
      target: screen.getByRole("option", { name: "Écouteurs" }),
    });

    expect(trigger?.textContent).toContain("Écouteurs");
    expect(formValue()).toBe("ecouteurs");
    expect(onValueChange).toHaveBeenCalledWith("ecouteurs");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("écrit le formulaire avant de prévenir le parent", async () => {
    // La barre de filtres relit le formulaire dans le même tour : elle doit y
    // trouver la nouvelle valeur, pas l'ancienne.
    let seen: FormDataEntryValue | null = null;
    const { trigger, user } = setup(
      vi.fn(() => {
        seen = new FormData(screen.getByRole("form", { name: "filtres" }) as HTMLFormElement).get(
          "category",
        );
      }),
    );

    await user.click(trigger);
    await user.pointer({
      keys: "[MouseLeft>]",
      target: screen.getByRole("option", { name: "Câblage" }),
    });

    expect(seen).toBe("cables");
  });

  it("se pilote entièrement au clavier", async () => {
    const { trigger, formValue, user } = setup();

    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    // L'option active est annoncée sans déplacer le focus.
    await user.keyboard("{ArrowDown}");
    expect(activeLabel(trigger)).toContain("Écouteurs");
    expect(document.activeElement).toBe(trigger);

    await user.keyboard("{Enter}");
    expect(formValue()).toBe("ecouteurs");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("va au début et à la fin", async () => {
    const { trigger, formValue, user } = setup();

    trigger.focus();
    await user.keyboard("{End}{Enter}");
    expect(formValue()).toBe("cables");

    await user.keyboard("{Home}{Enter}");
    expect(formValue()).toBe("");
  });

  it("Échap ferme sans changer la valeur", async () => {
    const { trigger, formValue, user } = setup();

    trigger.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Escape}");

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(formValue()).toBe("casques");
    expect(document.activeElement).toBe(trigger);
  });

  it("un clic extérieur ferme sans changer la valeur", async () => {
    const { trigger, formValue, user } = setup();

    await user.click(trigger);
    await user.click(document.body);

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(formValue()).toBe("casques");
  });

  it("la recherche par frappe ignore les accents", async () => {
    const { trigger, user } = setup();

    trigger.focus();
    await user.keyboard("e");

    expect(activeLabel(trigger)).toContain("Écouteurs");
  });

  it("une même lettre répétée passe à l'option suivante", async () => {
    const { trigger, user } = setup();

    trigger.focus();
    // Depuis « Casques » : « c » va à la suivante qui commence par c.
    await user.keyboard("c");
    expect(activeLabel(trigger)).toContain("Convertisseurs");

    await new Promise((resolve) => setTimeout(resolve, 600));
    await user.keyboard("c");
    expect(activeLabel(trigger)).toContain("Câblage");
  });
});

describe("Checkbox", () => {
  it("garde la case native : cochable au clavier et lue par le formulaire", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <form aria-label="f">
        <Checkbox name="inStock" value="true" onChange={onChange}>
          Disponibles seulement
        </Checkbox>
      </form>,
    );

    const box = screen.getByRole("checkbox", { name: "Disponibles seulement" });
    box.focus();
    await user.keyboard(" ");

    expect((box as HTMLInputElement).checked).toBe(true);
    expect(onChange).toHaveBeenCalledOnce();
    expect(
      new FormData(screen.getByRole("form", { name: "f" }) as HTMLFormElement).get("inStock"),
    ).toBe("true");
  });
});
