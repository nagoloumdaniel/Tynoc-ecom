import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

/**
 * Le routeur de Next n'existe que dans un contexte d'application.
 *
 * Hors de lui, `useRouter` lève, et un test de carte produit échouerait pour
 * une raison qui n'a rien à voir avec ce qu'il vérifie. On fournit donc le
 * minimum utilisable, avec des fonctions espionnes : un test qui veut
 * contrôler une navigation peut les interroger.
 */
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  unstable_rethrow: () => undefined,
}));

/**
 * Préparation des tests de composants (P11.6).
 *
 * `cleanup` démonte l'arbre après chaque test. Sans lui, les rendus
 * s'empilent dans le même document et une requête comme « le bouton Ajouter »
 * finit par en trouver trois, avec un message d'échec qui n'aide pas.
 */
afterEach(() => {
  cleanup();
});

/**
 * jsdom n'implémente pas ces deux API, que les composants utilisent.
 *
 * `showModal` et `close` sont le cœur du dialogue natif sur lequel repose tout
 * le tiroir mobile ; `matchMedia` est interrogé par la bibliothèque de
 * notifications. Les absenter produit des erreurs qui n'ont rien à voir avec
 * le comportement testé.
 */
if (typeof window !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    };
  }

  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
}

expect.extend({});
