/**
 * Suppression des tirets cadratins, branchée sur `npm run format`.
 *
 * Convention d'écriture du projet : le tiret cadratin, U+2014, n'apparaît
 * nulle part.
 * Le nettoyage manuel suffisait jusqu'ici, sauf pour un cas qui revient tout
 * seul : `next dev` réécrit son bloc en tête de `AGENTS.md` à **chaque**
 * démarrage, tirets compris. Le générateur n'offre aucune désactivation, la
 * réécriture est inconditionnelle.
 *
 * Le remplacement n'est volontairement pas mécanique. Un tiret employé en
 * incise devient une virgule, un tiret qui introduit une explication devient
 * un point. Tout convertir en deux-points laisserait des phrases qui en
 * portent deux.
 *
 * Les motifs connus sont donc listés explicitement, et tout tiret imprévu est
 * signalé au lieu d'être remplacé au jugé.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";

// Construit à partir de son point de code : écrit en échappement littéral,
// le formateur le replierait en caractère, et ce fichier se signalerait
// lui-même à chaque exécution.
const EM_DASH = String.fromCharCode(0x2014);

/** Réécritures connues, appliquées avant la règle générale. */
const KNOWN: [string, string][] = [
  [
    `This version has breaking changes ${EM_DASH} APIs, conventions, and file structure may all differ`,
    "This version has breaking changes. APIs, conventions, and file structure may all differ",
  ],
  [
    `This block is written and re-added by \`next dev\` ${EM_DASH} verify at`,
    "This block is written and re-added by `next dev`. Verify it at",
  ],
];

const files = globSync("**/*.{ts,tsx,css,md,json,mjs,yml}", {
  exclude: (path) =>
    path.includes("node_modules") || path.includes(".next") || path.includes(".git"),
});

let changed = 0;

for (const file of files) {
  const original = readFileSync(file, "utf8");
  if (!original.includes(EM_DASH)) continue;

  let updated = original;
  for (const [from, to] of KNOWN) updated = updated.split(from).join(to);

  if (updated.includes(EM_DASH)) {
    // Reste un cas non prévu : le signaler plutôt que de deviner une
    // ponctuation qui pourrait changer le sens de la phrase.
    console.warn(`${file} : tiret cadratin non traité, à reprendre à la main.`);
  }

  if (updated !== original) {
    writeFileSync(file, updated, "utf8");
    changed += 1;
    console.log(`${file} : nettoyé.`);
  }
}

if (changed === 0) console.log("Aucun tiret cadratin à retirer.");
