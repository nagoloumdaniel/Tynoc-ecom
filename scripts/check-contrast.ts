/**
 * Vérification des contrastes WCAG (P9.6).
 *
 * Les valeurs sont **lues dans `globals.css`**, jamais recopiées ici. Un
 * script qui duplique les tokens devient faux dès la première retouche de
 * palette, et le pire est qu'il continue d'afficher « conforme ».
 *
 * Le calcul suit la chaîne OKLCH vers OKLab vers sRGB linéaire, puis la
 * formule de luminance relative de WCAG 2.
 *
 * Seuils appliqués :
 *   4,5:1 pour du texte (1.4.3)
 *   3:1   pour la limite visible d'un composant d'interface (1.4.11)
 *
 * Un séparateur décoratif n'entre pas dans 1.4.11 : il ne sert pas à
 * identifier un composant. C'est pourquoi `line-subtle` et `line` ne sont pas
 * dans la liste, contrairement à `line-strong`, qui borde les champs, les
 * boutons contournés et le sélecteur de quantité.
 */

import { readFileSync } from "node:fs";

type Rgb = [number, number, number];

function oklchToSrgb(L: number, C: number, H: number): Rgb {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((value) => Math.min(Math.max(value, 0), 1)) as Rgb;
}

/**
 * Luminance relative.
 *
 * Les composantes sRGB sont déjà linéaires ici, puisqu'elles sortent de la
 * conversion OKLab sans encodage gamma. Il ne reste que la pondération.
 */
function luminance([r, g, b]: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: Rgb, background: Rgb): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

/** Extrait les deux valeurs d'un token déclaré en `light-dark(...)`. */
function readTokens(css: string): Map<string, { light: Rgb; dark: Rgb }> {
  const tokens = new Map<string, { light: Rgb; dark: Rgb }>();
  const pattern = /--([a-z0-9-]+):\s*light-dark\(\s*oklch\(([^)]+)\)\s*,\s*oklch\(([^)]+)\)\s*\)/g;

  for (const match of css.matchAll(pattern)) {
    const [, name, lightRaw, darkRaw] = match;
    if (!name || !lightRaw || !darkRaw) continue;

    const parse = (raw: string): Rgb | null => {
      // Les valeurs avec alpha (`/ 0.45`) concernent les ombres, hors sujet.
      if (raw.includes("/")) return null;
      const [l, c, h] = raw.trim().split(/\s+/).map(Number);
      if (l === undefined || c === undefined || h === undefined) return null;
      return oklchToSrgb(l, c, h);
    };

    const light = parse(lightRaw);
    const dark = parse(darkRaw);
    if (light && dark) tokens.set(name, { light, dark });
  }

  return tokens;
}

/** Couples réellement utilisés dans l'interface, avec leur seuil. */
const PAIRS: [string, string, number][] = [
  ["ink-strong", "surface-0", 4.5],
  ["ink", "surface-0", 4.5],
  ["ink-muted", "surface-0", 4.5],
  ["ink-faint", "surface-0", 4.5],
  ["ink-strong", "surface-1", 4.5],
  ["ink-muted", "surface-1", 4.5],
  ["ink-muted", "surface-2", 4.5],
  ["on-action", "action", 4.5],
  ["signal-ink", "signal-soft", 4.5],
  ["peak-ink", "peak-soft", 4.5],
  ["jade-ink", "jade-soft", 4.5],
  ["peak-ink", "surface-0", 4.5],
  ["jade-ink", "surface-0", 4.5],
  ["signal-ink", "surface-0", 4.5],
  ["line-strong", "surface-0", 3],
  ["line-strong", "surface-1", 3],
];

const tokens = readTokens(readFileSync("src/app/globals.css", "utf8"));
let failures = 0;

for (const theme of ["light", "dark"] as const) {
  console.log(`\n${theme === "light" ? "CLAIR" : "SOMBRE"}`);

  for (const [foreground, background, minimum] of PAIRS) {
    const fg = tokens.get(foreground);
    const bg = tokens.get(background);

    if (!fg || !bg) {
      console.error(`  MANQUANT  ${foreground} ou ${background} absent de globals.css`);
      failures += 1;
      continue;
    }

    const ratio = contrast(fg[theme], bg[theme]);
    const passes = ratio >= minimum;
    if (!passes) failures += 1;

    console.log(
      `  ${passes ? "ok    " : "ECHEC "}${ratio.toFixed(2).padStart(5)} / ${minimum}   ${foreground} sur ${background}`,
    );
  }
}

console.log(
  failures === 0
    ? `\n${PAIRS.length * 2} couples vérifiés, tous conformes.`
    : `\n${failures} couple(s) sous le seuil.`,
);

process.exitCode = failures === 0 ? 0 : 1;
