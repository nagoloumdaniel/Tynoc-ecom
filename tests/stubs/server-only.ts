/**
 * Doublure de `server-only` pour les tests.
 *
 * Le paquet réel lève une erreur dès qu'il est importé hors d'un Server
 * Component : c'est exactement son rôle, et il faut le garder dans le code de
 * production, où il empêche un composant client d'aspirer `env` et ses secrets
 * dans le bundle (P15.28).
 *
 * Les tests, eux, s'exécutent dans Node sans contexte React. On ne peut pas non
 * plus s'en sortir par la condition `react-server` : le SDK AWS classe
 * `module` avant `node` dans son champ `exports`, si bien que toucher aux
 * conditions de résolution le fait basculer vers des bundles non chargeables
 * par Node. Un alias explicite règle le problème sans effet de bord.
 */
export {};
