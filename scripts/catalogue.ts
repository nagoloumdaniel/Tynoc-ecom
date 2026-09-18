/**
 * Jeu de données du seed (P2.8).
 *
 * Huit catégories, quarante-sept produits. Pas de « Produit 1 / Produit 2 » :
 * le ton du magasin est factuel (voir `docs/ARCHITECTURE.md` § 2), donc les
 * fiches portent de vraies caractéristiques et les prix couvrent une amplitude
 * réelle, de 9 € à 1 899 €. C'est cette amplitude qui rend le filtre de prix
 * démontrable, et ce sont les `tags` qui rendent les filtres combinables.
 *
 * Les stocks sont volontairement variés : plusieurs produits sont à zéro ou
 * sous le seuil de cinq, pour que les états « rupture » et « bientôt épuisé »
 * existent dès le premier lancement au lieu d'être inventés en démonstration.
 *
 * Les images pointent vers un service de photographies déterministe. Ce sont
 * des **substituts** assumés : la photographie produit réelle est traitée en
 * P17.18. L'URL dépend du slug, donc un produit garde la même image.
 */

export interface CategorySeed {
  slug: string;
  name: string;
  description: string;
  position: number;
}

export interface ProductSeed {
  slug: string;
  title: string;
  brand: string;
  summary: string;
  description: string;
  priceCents: number;
  stock: number;
  categorySlug: string;
  tags: string[];
  specs: { label: string; value: string }[];
}

export const categories: CategorySeed[] = [
  {
    slug: "casques",
    name: "Casques",
    description:
      "Casques circum-auriculaires ouverts et fermés, du moniteur de studio au casque de salon. L'ouverture conditionne la scène sonore autant que l'isolation.",
    position: 1,
  },
  {
    slug: "ecouteurs",
    name: "Écouteurs",
    description:
      "Intra-auriculaires filaires et sans fil. Transducteurs dynamiques, planars et armatures équilibrées, pour l'écoute nomade comme pour le monitoring.",
    position: 2,
  },
  {
    slug: "enceintes",
    name: "Enceintes",
    description:
      "Moniteurs actifs et enceintes passives de proximité. Réponse mesurée, placement documenté, rien qui flatte artificiellement le grave.",
    position: 3,
  },
  {
    slug: "convertisseurs",
    name: "Convertisseurs",
    description:
      "Convertisseurs numérique-analogique de bureau et nomades. Le maillon qui décide de ce qui sort réellement de votre source.",
    position: 4,
  },
  {
    slug: "amplificateurs",
    name: "Amplificateurs",
    description:
      "Amplificateurs casque à transistors et à tubes. Un casque à haute impédance sans amplification ne donne jamais ce qu'il sait faire.",
    position: 5,
  },
  {
    slug: "microphones",
    name: "Microphones",
    description:
      "Dynamiques et statiques, pour la voix parlée, la scène et la prise d'instrument. Directivité et niveau de bruit indiqués pour chaque modèle.",
    position: 6,
  },
  {
    slug: "cables",
    name: "Câblage",
    description:
      "Liaisons symétriques et asymétriques, longueurs courantes, connectique éprouvée. Le câble ne transforme pas le son, il évite de le dégrader.",
    position: 7,
  },
  {
    slug: "accessoires",
    name: "Accessoires",
    description:
      "Supports, coussinets, découplage et commutation. Les pièces qui ne s'entendent pas mais qui décident du confort et de la durée de vie.",
    position: 8,
  },
];

export const products: ProductSeed[] = [
  // --- Casques -------------------------------------------------------------
  {
    slug: "sennheiser-hd-660s2",
    title: "HD 660S2",
    brand: "Sennheiser",
    summary: "Casque ouvert 300 Ω au grave étendu, successeur direct du HD 650.",
    description:
      "Transducteur dynamique de 38 mm dans une charge arrière retravaillée : par rapport au HD 660S, la réponse descend plus bas sans empâter le bas-médium. L'impédance de 300 Ω demande une amplification dédiée, faute de quoi le niveau reste insuffisant sur une sortie de téléphone ou d'ordinateur portable. Coussinets et câble se remplacent sans outil.",
    priceCents: 54900,
    stock: 12,
    categorySlug: "casques",
    tags: ["ouvert", "studio", "haute-impedance"],
    specs: [
      { label: "Type", value: "Circum-auriculaire ouvert" },
      { label: "Impédance", value: "300 Ω" },
      { label: "Réponse en fréquence", value: "8 Hz à 41,5 kHz" },
      { label: "Distorsion", value: "Inférieure à 0,04 % à 1 kHz" },
      { label: "Poids", value: "260 g sans câble" },
    ],
  },
  {
    slug: "sennheiser-hd-490-pro",
    title: "HD 490 Pro",
    brand: "Sennheiser",
    summary: "Moniteur ouvert 130 Ω livré avec deux jeux de coussinets au rendu distinct.",
    description:
      "Conçu pour le mixage et le mastering. Les coussinets velours ouvrent la scène, les coussinets tissu resserrent l'image et accentuent légèrement le grave : le même casque sert de référence et de contrôle. Livré avec câble symétrique et étui rigide.",
    priceCents: 39900,
    stock: 7,
    categorySlug: "casques",
    tags: ["ouvert", "studio"],
    specs: [
      { label: "Type", value: "Circum-auriculaire ouvert" },
      { label: "Impédance", value: "130 Ω" },
      { label: "Réponse en fréquence", value: "5 Hz à 36 kHz" },
      { label: "Poids", value: "260 g sans câble" },
    ],
  },
  {
    slug: "beyerdynamic-dt-1990-pro",
    title: "DT 1990 Pro",
    brand: "Beyerdynamic",
    summary: "Ouvert 250 Ω, transducteur Tesla, aigu analytique assumé.",
    description:
      "Référence de contrôle en studio depuis 2016. L'aigu est présent et ne pardonne pas une source médiocre, ce qui est exactement la raison pour laquelle on l'achète. Deux jeux de coussinets modifient sensiblement l'équilibre entre le grave et le haut du spectre. Fabrication allemande, pièces détachées disponibles.",
    priceCents: 52900,
    stock: 4,
    categorySlug: "casques",
    tags: ["ouvert", "studio", "haute-impedance"],
    specs: [
      { label: "Type", value: "Circum-auriculaire ouvert" },
      { label: "Impédance", value: "250 Ω" },
      { label: "Réponse en fréquence", value: "5 Hz à 40 kHz" },
      { label: "Pression acoustique", value: "102 dB SPL" },
    ],
  },
  {
    slug: "beyerdynamic-dt-770-pro-80",
    title: "DT 770 Pro 80 Ω",
    brand: "Beyerdynamic",
    summary: "Fermé, isolant, entièrement réparable : le casque de cabine par défaut.",
    description:
      "Le casque de retour le plus répandu en cabine d'enregistrement, pour une raison simple : il isole, il encaisse, et chaque pièce se remplace. La version 80 Ω est le compromis courant entre niveau disponible sur une interface audio et contrôle du grave.",
    priceCents: 16900,
    stock: 23,
    categorySlug: "casques",
    tags: ["ferme", "studio"],
    specs: [
      { label: "Type", value: "Circum-auriculaire fermé" },
      { label: "Impédance", value: "80 Ω" },
      { label: "Réponse en fréquence", value: "5 Hz à 35 kHz" },
      { label: "Poids", value: "270 g sans câble" },
    ],
  },
  {
    slug: "audio-technica-ath-m50x",
    title: "ATH-M50x",
    brand: "Audio-Technica",
    summary: "Fermé 38 Ω, pliable, trois câbles détachables fournis.",
    description:
      "Grave généreux et isolation correcte, dans un format qui se replie pour le transport. Ce n'est pas un moniteur neutre, c'est un casque de travail polyvalent qui tient la route sur une sortie casque d'ordinateur portable sans amplification.",
    priceCents: 15900,
    stock: 18,
    categorySlug: "casques",
    tags: ["ferme", "nomade"],
    specs: [
      { label: "Type", value: "Circum-auriculaire fermé" },
      { label: "Impédance", value: "38 Ω" },
      { label: "Réponse en fréquence", value: "15 Hz à 28 kHz" },
      { label: "Poids", value: "285 g sans câble" },
    ],
  },
  {
    slug: "hifiman-sundara",
    title: "Sundara",
    brand: "HiFiMan",
    summary: "Planar magnétique ouvert 32 Ω, médium d'une netteté rare à ce tarif.",
    description:
      "Transducteur planar de grande surface dans un châssis métal. Le rendu est rapide et le médium très lisible ; en contrepartie le rendement est faible, et l'écoute sérieuse suppose un amplificateur capable de tenir la charge.",
    priceCents: 34900,
    stock: 6,
    categorySlug: "casques",
    tags: ["ouvert", "planar"],
    specs: [
      { label: "Type", value: "Planar magnétique ouvert" },
      { label: "Impédance", value: "32 Ω" },
      { label: "Réponse en fréquence", value: "6 Hz à 75 kHz" },
      { label: "Sensibilité", value: "94 dB" },
    ],
  },
  {
    slug: "focal-clear-mg",
    title: "Clear MG",
    brand: "Focal",
    summary: "Dôme magnésium 55 Ω, fabrication française, scène large et tenue en transitoire.",
    description:
      "Le dôme en magnésium pur donne un médium dense et une attaque nette sans dureté. Châssis et coussinets sont pensés pour des écoutes longues. Livré avec trois câbles, dont un symétrique XLR à quatre broches, et un étui rigide.",
    priceCents: 149900,
    stock: 0,
    categorySlug: "casques",
    tags: ["ouvert", "haut-de-gamme"],
    specs: [
      { label: "Type", value: "Circum-auriculaire ouvert" },
      { label: "Impédance", value: "55 Ω" },
      { label: "Réponse en fréquence", value: "5 Hz à 28 kHz" },
      { label: "Distorsion", value: "Inférieure à 0,25 % à 1 kHz, 100 dB SPL" },
    ],
  },
  {
    slug: "sony-wh-1000xm5",
    title: "WH-1000XM5",
    brand: "Sony",
    summary: "Sans fil, réduction de bruit active, trente heures d'autonomie.",
    description:
      "La réduction de bruit reste la référence en transport, et le maintien du niveau vocal en appel est nettement supérieur à la génération précédente. En filaire, l'électronique se contourne partiellement. Le casque ne se replie plus à plat : l'étui est plus volumineux que celui du XM4.",
    priceCents: 39900,
    stock: 3,
    categorySlug: "casques",
    tags: ["sans-fil", "nomade", "reduction-de-bruit"],
    specs: [
      { label: "Type", value: "Circum-auriculaire fermé" },
      { label: "Autonomie", value: "30 h avec réduction de bruit" },
      { label: "Bluetooth", value: "5.2, LDAC et AAC" },
      { label: "Charge rapide", value: "3 h d'écoute en 3 min" },
    ],
  },
  {
    slug: "akg-k371",
    title: "K371",
    brand: "AKG",
    summary: "Fermé 32 Ω, courbe proche de la cible Harman, pliable.",
    description:
      "L'un des rares casques fermés à suivre d'aussi près une cible de réponse documentée. Utile en contrôle nomade quand la référence du studio n'est pas disponible. Trois câbles détachables de longueurs différentes sont fournis.",
    priceCents: 14900,
    stock: 11,
    categorySlug: "casques",
    tags: ["ferme", "studio", "nomade"],
    specs: [
      { label: "Type", value: "Circum-auriculaire fermé" },
      { label: "Impédance", value: "32 Ω" },
      { label: "Réponse en fréquence", value: "5 Hz à 40 kHz" },
      { label: "Poids", value: "255 g sans câble" },
    ],
  },

  // --- Écouteurs -----------------------------------------------------------
  {
    slug: "moondrop-aria-2",
    title: "Aria 2",
    brand: "Moondrop",
    summary: "Intra dynamique 32 Ω à membrane céramique, câble détachable.",
    description:
      "Réglage chaud et sans agressivité, pensé pour l'écoute longue en transport. La coque métallique reste discrète et le câble à connecteurs 0,78 mm se remplace facilement. Trois tailles d'embouts silicone sont fournies.",
    priceCents: 8900,
    stock: 26,
    categorySlug: "ecouteurs",
    tags: ["nomade", "filaire"],
    specs: [
      { label: "Transducteur", value: "Dynamique 10 mm, membrane céramique" },
      { label: "Impédance", value: "32 Ω" },
      { label: "Sensibilité", value: "122 dB par Vrms" },
      { label: "Connectique", value: "0,78 mm 2 broches" },
    ],
  },
  {
    slug: "sennheiser-ie-200",
    title: "IE 200",
    brand: "Sennheiser",
    summary: "Intra 18 Ω, embouts à double position pour ajuster le grave.",
    description:
      "Le même transducteur TrueResponse que les modèles supérieurs de la gamme, dans une coque plus simple. La position de l'embout modifie réellement la quantité de grave : enfoncé, la réponse se resserre ; sorti, l'assise remonte.",
    priceCents: 14900,
    stock: 9,
    categorySlug: "ecouteurs",
    tags: ["nomade", "filaire", "monitoring"],
    specs: [
      { label: "Transducteur", value: "Dynamique TrueResponse 7 mm" },
      { label: "Impédance", value: "18 Ω" },
      { label: "Réponse en fréquence", value: "6 Hz à 20 kHz" },
      { label: "Connectique", value: "MMCX" },
    ],
  },
  {
    slug: "7hz-timeless-ii",
    title: "Timeless II",
    brand: "7Hz",
    summary: "Planar 14,2 mm en intra, attaque très rapide.",
    description:
      "Le format planar en intra donne une tenue en transitoire que les dynamiques atteignent rarement, particulièrement sur les percussions. Le revers habituel du planar reste présent : il faut du niveau, et une source faible le laisse mou.",
    priceCents: 22900,
    stock: 5,
    categorySlug: "ecouteurs",
    tags: ["planar", "filaire"],
    specs: [
      { label: "Transducteur", value: "Planar magnétique 14,2 mm" },
      { label: "Impédance", value: "14,8 Ω" },
      { label: "Sensibilité", value: "104 dB par Vrms" },
      { label: "Connectique", value: "0,78 mm 2 broches" },
    ],
  },
  {
    slug: "etymotic-er2xr",
    title: "ER2XR",
    brand: "Etymotic",
    summary: "Isolation passive de 35 à 42 dB, insertion profonde.",
    description:
      "L'isolation la plus forte du catalogue, sans aucune électronique : l'embout descend profondément dans le conduit. L'insertion demande une habitude, mais aucune réduction de bruit active n'atteint ce niveau d'atténuation dans les médiums.",
    priceCents: 11900,
    stock: 8,
    categorySlug: "ecouteurs",
    tags: ["isolation", "filaire", "nomade"],
    specs: [
      { label: "Transducteur", value: "Dynamique" },
      { label: "Impédance", value: "15 Ω" },
      { label: "Isolation passive", value: "35 à 42 dB" },
      { label: "Connectique", value: "MMCX" },
    ],
  },
  {
    slug: "apple-airpods-pro-3",
    title: "AirPods Pro 3",
    brand: "Apple",
    summary: "Sans fil, réduction de bruit adaptative, audio spatial personnalisé.",
    description:
      "Intégration très aboutie dans l'écosystème Apple : appairage immédiat, bascule entre appareils, réglages accessibles depuis le système. Hors de cet écosystème l'intérêt retombe à celui d'un bon intra Bluetooth. Boîtier de charge avec localisation intégrée.",
    priceCents: 27900,
    stock: 14,
    categorySlug: "ecouteurs",
    tags: ["sans-fil", "nomade", "reduction-de-bruit"],
    specs: [
      { label: "Type", value: "Intra-auriculaire sans fil" },
      { label: "Autonomie", value: "6 h, 30 h avec le boîtier" },
      { label: "Résistance", value: "IP54" },
      { label: "Charge", value: "USB-C et sans fil Qi" },
    ],
  },
  {
    slug: "truthear-hexa",
    title: "Hexa",
    brand: "Truthear",
    summary: "Hybride à quatre transducteurs, réglage neutre, moins de 80 €.",
    description:
      "Un dynamique pour le grave et trois armatures équilibrées pour le reste du spectre. Le réglage vise la neutralité plutôt que l'effet, ce qui en fait un bon premier intra de référence pour apprendre à écouter un mixage.",
    priceCents: 7900,
    stock: 31,
    categorySlug: "ecouteurs",
    tags: ["filaire", "monitoring"],
    specs: [
      { label: "Transducteurs", value: "1 dynamique et 3 armatures équilibrées" },
      { label: "Impédance", value: "20,5 Ω" },
      { label: "Sensibilité", value: "120 dB par Vrms" },
      { label: "Connectique", value: "0,78 mm 2 broches" },
    ],
  },

  // --- Enceintes -----------------------------------------------------------
  {
    slug: "kef-ls50-meta",
    title: "LS50 Meta",
    brand: "KEF",
    summary: "Deux voies passives à transducteur coaxial, la paire.",
    description:
      "Le transducteur coaxial Uni-Q place l'aigu au centre du grave-médium : la source sonore reste ponctuelle et la zone d'écoute est nettement plus large qu'avec un montage classique. La technologie MAT absorbe le rayonnement arrière du tweeter. Amplification externe requise.",
    priceCents: 129900,
    stock: 4,
    categorySlug: "enceintes",
    tags: ["passive", "bibliotheque"],
    specs: [
      { label: "Type", value: "Deux voies passive, bass-reflex" },
      { label: "Réponse en fréquence", value: "79 Hz à 28 kHz à plus ou moins 3 dB" },
      { label: "Sensibilité", value: "85 dB" },
      { label: "Puissance conseillée", value: "40 à 100 W" },
    ],
  },
  {
    slug: "genelec-8030c",
    title: "8030C",
    brand: "Genelec",
    summary: "Moniteur actif bi-amplifié, la paire, calibrage GLM disponible.",
    description:
      "Standard de contrôle en régie depuis des années. Le guide d'onde maîtrise la directivité, et le châssis moulé supprime les résonances de coffret. Le réglage d'adaptation à la pièce se fait par interrupteurs, ou finement via le système GLM en option.",
    priceCents: 189900,
    stock: 2,
    categorySlug: "enceintes",
    tags: ["active", "studio", "haut-de-gamme"],
    specs: [
      { label: "Type", value: "Moniteur actif bi-amplifié" },
      { label: "Réponse en fréquence", value: "47 Hz à 25 kHz" },
      { label: "Amplification", value: "50 W grave et 50 W aigu" },
      { label: "Niveau maximal", value: "104 dB SPL" },
    ],
  },
  {
    slug: "yamaha-hs5",
    title: "HS5",
    brand: "Yamaha",
    summary: "Moniteur actif 5 pouces, réglages de pièce sur le panneau arrière.",
    description:
      "Réputé pour ne rien flatter : ce qui sonne bien sur une HS5 sonne généralement bien ailleurs. Le grave est limité par le format, ce qui pousse à vérifier le bas du spectre sur un autre système. Entrées XLR et jack 6,35 mm symétriques.",
    priceCents: 21900,
    stock: 10,
    categorySlug: "enceintes",
    tags: ["active", "studio"],
    specs: [
      { label: "Type", value: "Moniteur actif bi-amplifié" },
      { label: "Réponse en fréquence", value: "54 Hz à 30 kHz" },
      { label: "Amplification", value: "45 W grave et 25 W aigu" },
      { label: "Entrées", value: "XLR et jack 6,35 mm symétriques" },
    ],
  },
  {
    slug: "adam-audio-t5v",
    title: "T5V",
    brand: "Adam Audio",
    summary: "Moniteur actif à tweeter à ruban plissé U-ART.",
    description:
      "Le tweeter à ruban plissé déplace l'air par un mouvement d'accordéon plutôt que par un dôme : l'aigu reste aéré même à niveau élevé. Le guide d'onde élargit la zone d'écoute utile, ce qui aide dans les petites pièces mal traitées.",
    priceCents: 19900,
    stock: 7,
    categorySlug: "enceintes",
    tags: ["active", "studio"],
    specs: [
      { label: "Type", value: "Moniteur actif bi-amplifié" },
      { label: "Réponse en fréquence", value: "45 Hz à 25 kHz" },
      { label: "Amplification", value: "70 W grave et 20 W aigu" },
      { label: "Niveau maximal", value: "106 dB SPL par paire" },
    ],
  },
  {
    slug: "kanto-yu4",
    title: "YU4",
    brand: "Kanto",
    summary: "Enceintes actives de bureau, Bluetooth aptX et entrée phono.",
    description:
      "Pensées pour un bureau ou un salon, pas pour une régie : l'entrée phono intégrée évite un préamplificateur séparé pour une platine vinyle, et la télécommande reste utile au quotidien. Finitions laquées disponibles.",
    priceCents: 39900,
    stock: 6,
    categorySlug: "enceintes",
    tags: ["active", "bureau", "sans-fil"],
    specs: [
      { label: "Type", value: "Enceinte active de bureau" },
      { label: "Réponse en fréquence", value: "50 Hz à 20 kHz" },
      { label: "Puissance", value: "70 W efficaces" },
      { label: "Entrées", value: "Phono RCA, optique, USB, Bluetooth aptX" },
    ],
  },
  {
    slug: "q-acoustics-3030i",
    title: "3030i",
    brand: "Q Acoustics",
    summary: "Passive à grand grave-médium de 165 mm, la paire.",
    description:
      "Un volume de coffret et un transducteur plus généreux que la moyenne des bibliothèques de ce prix : le grave descend sans caisson additionnel. Le coffret utilise un amortissement à points de contrainte qui limite les colorations.",
    priceCents: 49900,
    stock: 5,
    categorySlug: "enceintes",
    tags: ["passive", "bibliotheque"],
    specs: [
      { label: "Type", value: "Deux voies passive, bass-reflex" },
      { label: "Réponse en fréquence", value: "46 Hz à 30 kHz" },
      { label: "Sensibilité", value: "88 dB" },
      { label: "Puissance conseillée", value: "25 à 75 W" },
    ],
  },

  // --- Convertisseurs ------------------------------------------------------
  {
    slug: "topping-e50",
    title: "E50",
    brand: "Topping",
    summary: "Convertisseur de bureau ES9068AS, sorties RCA et symétriques.",
    description:
      "Mesures excellentes pour l'encombrement et le prix. Entrée USB, optique et coaxiale, sortie sur RCA ou mini-XLR symétrique. Aucune sortie casque : c'est un convertisseur, pas une solution tout-en-un.",
    priceCents: 24900,
    stock: 13,
    categorySlug: "convertisseurs",
    tags: ["bureau", "symetrique"],
    specs: [
      { label: "Puce", value: "ES9068AS" },
      { label: "Résolution", value: "32 bits à 768 kHz, DSD512" },
      { label: "Distorsion", value: "0,00009 %" },
      { label: "Sorties", value: "RCA et mini-XLR symétrique" },
    ],
  },
  {
    slug: "rme-adi-2-dac-fs",
    title: "ADI-2 DAC FS",
    brand: "RME",
    summary: "Convertisseur et amplificateur casque de référence, égaliseur paramétrique intégré.",
    description:
      "Bien plus qu'un convertisseur : égaliseur paramétrique à cinq bandes, filtres réglables, deux sorties casque aux impédances différentes, affichage détaillé. C'est l'appareil que l'on garde quand tout le reste change. Pilotes stables sous Windows et macOS.",
    priceCents: 119900,
    stock: 3,
    categorySlug: "convertisseurs",
    tags: ["bureau", "haut-de-gamme", "studio"],
    specs: [
      { label: "Puce", value: "AKM AK4493" },
      { label: "Résolution", value: "32 bits à 768 kHz, DSD256" },
      { label: "Sorties casque", value: "Jack 6,35 mm et sortie IEM à faible impédance" },
      { label: "Traitement", value: "Égaliseur paramétrique 5 bandes, correction de loudness" },
    ],
  },
  {
    slug: "chord-mojo-2",
    title: "Mojo 2",
    brand: "Chord",
    summary: "Convertisseur nomade sur batterie, égaliseur analogique à quatre bandes.",
    description:
      "Architecture FPGA propre à Chord plutôt qu'une puce du commerce. La batterie interne évite de ponctionner le téléphone, et l'égaliseur agit dans le domaine analogique sans perte de résolution. Il chauffe sensiblement en charge.",
    priceCents: 64900,
    stock: 4,
    categorySlug: "convertisseurs",
    tags: ["nomade", "haut-de-gamme"],
    specs: [
      { label: "Architecture", value: "FPGA Chord, 40 960 prises" },
      { label: "Résolution", value: "32 bits à 768 kHz, DSD256" },
      { label: "Autonomie", value: "8 h" },
      { label: "Sorties", value: "Deux jacks 3,5 mm" },
    ],
  },
  {
    slug: "ifi-zen-dac-3",
    title: "Zen DAC 3",
    brand: "iFi",
    summary: "Convertisseur et amplificateur casque, sortie symétrique 4,4 mm.",
    description:
      "Le point d'entrée le plus courant vers l'écoute sérieuse au casque : convertisseur correct, amplification suffisante pour la plupart des casques de moins de 250 Ω, et une sortie symétrique 4,4 mm rare à ce tarif. Alimentation externe recommandée pour les charges difficiles.",
    priceCents: 19900,
    stock: 16,
    categorySlug: "convertisseurs",
    tags: ["bureau", "symetrique"],
    specs: [
      { label: "Puce", value: "Burr-Brown" },
      { label: "Résolution", value: "32 bits à 384 kHz, DSD256" },
      { label: "Sorties casque", value: "Jack 6,35 mm et 4,4 mm symétrique" },
      { label: "Puissance", value: "1 200 mW sous 32 Ω en symétrique" },
    ],
  },
  {
    slug: "schiit-modi-plus",
    title: "Modi+",
    brand: "Schiit",
    summary: "Convertisseur compact, trois entrées, alimentation USB.",
    description:
      "Simple et sans compromis inutile : une entrée USB, une optique, une coaxiale, une sortie RCA. Le boîtier s'empile avec un Magni+ pour former un ensemble de bureau complet et peu encombrant.",
    priceCents: 12900,
    stock: 21,
    categorySlug: "convertisseurs",
    tags: ["bureau", "compact"],
    specs: [
      { label: "Résolution", value: "24 bits à 192 kHz" },
      { label: "Entrées", value: "USB-C, optique, coaxiale" },
      { label: "Sortie", value: "RCA" },
      { label: "Distorsion", value: "Inférieure à 0,0015 %" },
    ],
  },
  {
    slug: "fiio-k11",
    title: "K11",
    brand: "FiiO",
    summary: "Ensemble convertisseur et amplificateur de bureau, 1 400 mW sous 32 Ω.",
    description:
      "Beaucoup de puissance disponible pour le prix, ce qui en fait un bon compagnon pour un planar peu sensible. Affichage du taux d'échantillonnage, gain commutable et sortie symétrique 4,4 mm en façade.",
    priceCents: 12900,
    stock: 19,
    categorySlug: "convertisseurs",
    tags: ["bureau", "symetrique"],
    specs: [
      { label: "Puce", value: "CS43198" },
      { label: "Résolution", value: "32 bits à 384 kHz, DSD256" },
      { label: "Puissance", value: "1 400 mW sous 32 Ω en symétrique" },
      { label: "Sorties casque", value: "Jack 6,35 mm et 4,4 mm symétrique" },
    ],
  },

  // --- Amplificateurs ------------------------------------------------------
  {
    slug: "schiit-magni-plus",
    title: "Magni+",
    brand: "Schiit",
    summary: "Amplificateur casque à transistors, gain commutable, fabrication américaine.",
    description:
      "Peu de fonctions, beaucoup de puissance propre. Le gain bas évite le souffle avec les intras sensibles, le gain haut alimente sans peine un 300 Ω. Il s'empile avec un Modi+ pour former un ensemble de bureau cohérent.",
    priceCents: 11900,
    stock: 15,
    categorySlug: "amplificateurs",
    tags: ["transistor", "bureau"],
    specs: [
      { label: "Puissance", value: "2 W sous 32 Ω" },
      { label: "Distorsion", value: "Inférieure à 0,0007 %" },
      { label: "Gain", value: "Commutable, 1x et 5x" },
      { label: "Entrée", value: "RCA" },
    ],
  },
  {
    slug: "topping-l30-ii",
    title: "L30 II",
    brand: "Topping",
    summary: "Amplificateur casque NFCA, protection de sortie intégrée.",
    description:
      "L'architecture NFCA donne un bruit de fond très bas, audible en pratique sur les intras sensibles. Le circuit de protection coupe la sortie en cas de défaut plutôt que d'envoyer un continu dans le casque.",
    priceCents: 15900,
    stock: 12,
    categorySlug: "amplificateurs",
    tags: ["transistor", "bureau"],
    specs: [
      { label: "Puissance", value: "3 500 mW sous 16 Ω" },
      { label: "Distorsion", value: "0,00006 %" },
      { label: "Bruit", value: "0,5 µV" },
      { label: "Gain", value: "Trois positions" },
    ],
  },
  {
    slug: "ifi-zen-can",
    title: "Zen Can",
    brand: "iFi",
    summary: "Amplificateur symétrique avec correction de grave analogique.",
    description:
      "La correction XBass agit dans le domaine analogique et reste discrète, contrairement à la plupart des accentuations de grave. Sortie symétrique 4,4 mm et gain sur quatre positions pour couvrir de l'intra au casque à haute impédance.",
    priceCents: 19900,
    stock: 9,
    categorySlug: "amplificateurs",
    tags: ["transistor", "symetrique", "bureau"],
    specs: [
      { label: "Puissance", value: "1 600 mW sous 64 Ω en symétrique" },
      { label: "Gain", value: "0, 6, 12 et 18 dB" },
      { label: "Sorties", value: "Jack 6,35 mm et 4,4 mm symétrique" },
      { label: "Traitement", value: "XBass analogique commutable" },
    ],
  },
  {
    slug: "feliks-echo-mk2",
    title: "Echo MkII",
    brand: "Feliks Audio",
    summary: "Amplificateur à tubes OTL, châssis bois massif, fabrication polonaise.",
    description:
      "Montage sans transformateur de sortie, particulièrement à l'aise avec les casques dynamiques à haute impédance. Les tubes se remplacent et modifient réellement le rendu, ce qui fait partie de l'intérêt de l'appareil. Prévoir une minute de chauffe avant écoute.",
    priceCents: 129900,
    stock: 1,
    categorySlug: "amplificateurs",
    tags: ["tube", "haut-de-gamme"],
    specs: [
      { label: "Architecture", value: "Tubes OTL en classe A" },
      { label: "Tubes", value: "2 x 6N6P et 2 x 6N1P" },
      { label: "Impédance conseillée", value: "80 à 600 Ω" },
      { label: "Entrées", value: "Deux paires RCA commutables" },
    ],
  },
  {
    slug: "smsl-sp400",
    title: "SP400",
    brand: "SMSL",
    summary: "Amplificateur symétrique THX AAA-888, deux sorties symétriques.",
    description:
      "Architecture THX à contre-réaction avancée : distorsion mesurée extrêmement basse et réserve de puissance importante. Destiné aux planars exigeants qui mettent en difficulté un amplificateur de bureau classique.",
    priceCents: 59900,
    stock: 4,
    categorySlug: "amplificateurs",
    tags: ["transistor", "symetrique", "haut-de-gamme"],
    specs: [
      { label: "Architecture", value: "THX AAA-888" },
      { label: "Puissance", value: "6 W sous 32 Ω en symétrique" },
      { label: "Distorsion", value: "0,00006 %" },
      { label: "Sorties", value: "XLR 4 broches et 4,4 mm" },
    ],
  },

  // --- Microphones ---------------------------------------------------------
  {
    slug: "shure-sm7b",
    title: "SM7B",
    brand: "Shure",
    summary: "Dynamique cardioïde pour la voix parlée, filtres commutables.",
    description:
      "Le microphone de radio et de podcast par excellence : il rejette très bien le hors-axe et pardonne une pièce non traitée. Son niveau de sortie est faible, un préamplificateur à fort gain ou un module d'appoint est presque toujours nécessaire.",
    priceCents: 41900,
    stock: 8,
    categorySlug: "microphones",
    tags: ["dynamique", "studio", "voix"],
    specs: [
      { label: "Type", value: "Dynamique" },
      { label: "Directivité", value: "Cardioïde" },
      { label: "Réponse en fréquence", value: "50 Hz à 20 kHz" },
      { label: "Gain conseillé", value: "60 dB et plus" },
    ],
  },
  {
    slug: "rode-nt1-5e-generation",
    title: "NT1 5e génération",
    brand: "Rode",
    summary: "Statique large membrane, sorties XLR et USB simultanées.",
    description:
      "L'un des microphones les plus silencieux de sa catégorie. La sortie USB enregistre en 32 bits à virgule flottante, ce qui rend la saturation d'enregistrement pratiquement impossible : le niveau se rattrape après coup. Suspension et filtre anti-pop fournis.",
    priceCents: 29900,
    stock: 11,
    categorySlug: "microphones",
    tags: ["statique", "studio", "usb"],
    specs: [
      { label: "Type", value: "Statique large membrane" },
      { label: "Directivité", value: "Cardioïde" },
      { label: "Bruit propre", value: "4 dBA" },
      { label: "Sorties", value: "XLR et USB-C en 32 bits flottant" },
    ],
  },
  {
    slug: "audio-technica-at2020",
    title: "AT2020",
    brand: "Audio-Technica",
    summary: "Statique cardioïde d'entrée de gamme, alimentation fantôme requise.",
    description:
      "Le premier vrai statique de beaucoup de home studios. Il demande une pièce raisonnablement traitée, car sa sensibilité capte tout ce qui traîne. Robuste, sans fonction superflue, et durable.",
    priceCents: 9900,
    stock: 24,
    categorySlug: "microphones",
    tags: ["statique", "studio"],
    specs: [
      { label: "Type", value: "Statique" },
      { label: "Directivité", value: "Cardioïde" },
      { label: "Réponse en fréquence", value: "20 Hz à 20 kHz" },
      { label: "Alimentation", value: "Fantôme 48 V" },
    ],
  },
  {
    slug: "shure-sm58",
    title: "SM58",
    brand: "Shure",
    summary: "Dynamique de scène, grille anti-choc, quasi indestructible.",
    description:
      "Standard mondial du chant sur scène depuis 1966. La bosse de présence met la voix en avant dans un mixage chargé, et la grille sphérique atténue les plosives. Il survit à des traitements qui détruiraient n'importe quel statique.",
    priceCents: 11900,
    stock: 30,
    categorySlug: "microphones",
    tags: ["dynamique", "scene", "voix"],
    specs: [
      { label: "Type", value: "Dynamique" },
      { label: "Directivité", value: "Cardioïde" },
      { label: "Réponse en fréquence", value: "50 Hz à 15 kHz" },
      { label: "Impédance", value: "150 Ω" },
    ],
  },
  {
    slug: "universal-audio-sd-1",
    title: "SD-1",
    brand: "Universal Audio",
    summary: "Dynamique à filtre de proximité et gain interne, sans alimentation.",
    description:
      "Un dynamique moderne pensé pour les pièces imparfaites : le filtre de proximité corrige l'accentuation du grave quand on parle près de la capsule, sans passer par un traitement logiciel. Le niveau de sortie est plus élevé que celui d'un SM7B.",
    priceCents: 19900,
    stock: 6,
    categorySlug: "microphones",
    tags: ["dynamique", "studio", "voix"],
    specs: [
      { label: "Type", value: "Dynamique" },
      { label: "Directivité", value: "Cardioïde" },
      { label: "Réponse en fréquence", value: "50 Hz à 16,5 kHz" },
      { label: "Filtres", value: "Coupe-bas et compensation de proximité" },
    ],
  },

  // --- Câblage -------------------------------------------------------------
  {
    slug: "mogami-gold-xlr-3m",
    title: "Câble XLR Gold Studio 3 m",
    brand: "Mogami",
    summary: "Liaison symétrique blindée, connecteurs Neutrik plaqués or.",
    description:
      "Le câble de studio le plus répandu, pour une raison mesurable : blindage efficace et soudures fiables. Trois mètres couvrent la distance d'une cabine à une régie sans boucle disgracieuse au sol.",
    priceCents: 6900,
    stock: 40,
    categorySlug: "cables",
    tags: ["symetrique", "studio"],
    specs: [
      { label: "Type", value: "XLR mâle vers XLR femelle" },
      { label: "Longueur", value: "3 m" },
      { label: "Connecteurs", value: "Neutrik plaqués or" },
      { label: "Blindage", value: "Tressé" },
    ],
  },
  {
    slug: "neutrik-jack-635-2m",
    title: "Câble jack 6,35 mm symétrique 2 m",
    brand: "Neutrik",
    summary: "TRS vers TRS pour liaison de moniteur ou d'insert.",
    description:
      "Liaison symétrique en jack six virgule trente-cinq, longueur adaptée à un poste de travail. Corps métal et détrompeur, conçu pour être branché et débranché sans se dégrader.",
    priceCents: 3900,
    stock: 35,
    categorySlug: "cables",
    tags: ["symetrique", "studio"],
    specs: [
      { label: "Type", value: "Jack 6,35 mm TRS vers TRS" },
      { label: "Longueur", value: "2 m" },
      { label: "Connecteurs", value: "Neutrik" },
      { label: "Section", value: "2 x 0,22 mm²" },
    ],
  },
  {
    slug: "audioquest-forest-usb-c-b",
    title: "Câble USB-C vers USB-B Forest 1,5 m",
    brand: "AudioQuest",
    summary: "Conducteurs cuivre long grain, séparation des paires données et alimentation.",
    description:
      "Destiné à relier un ordinateur à un convertisseur d'entrée USB-B. La séparation physique des paires limite le passage de bruit d'alimentation vers la ligne de données. Le remplacement d'un câble générique s'entend surtout sur les installations bruitées.",
    priceCents: 8900,
    stock: 17,
    categorySlug: "cables",
    tags: ["usb", "bureau"],
    specs: [
      { label: "Type", value: "USB-C vers USB-B" },
      { label: "Longueur", value: "1,5 m" },
      { label: "Conducteurs", value: "Cuivre long grain" },
      { label: "Blindage", value: "Double" },
    ],
  },
  {
    slug: "qed-xt25-2x3m",
    title: "Câble haut-parleur XT25, 2 x 3 m",
    brand: "QED",
    summary: "Paire préparée pour enceintes passives, fiches bananes serties.",
    description:
      "Deux longueurs de trois mètres, fiches bananes déjà serties : rien à dénuder et aucun brin isolé qui vienne toucher la borne voisine. Section adaptée aux enceintes de bibliothèque sur des distances courtes.",
    priceCents: 9900,
    stock: 12,
    categorySlug: "cables",
    tags: ["enceinte", "salon"],
    specs: [
      { label: "Type", value: "Câble haut-parleur, paire" },
      { label: "Longueur", value: "2 x 3 m" },
      { label: "Section", value: "2,5 mm²" },
      { label: "Terminaison", value: "Fiches bananes serties" },
    ],
  },
  {
    slug: "neutrik-adaptateur-635-35",
    title: "Adaptateur 6,35 vers 3,5 mm",
    brand: "Neutrik",
    summary: "Corps métal, contacts plaqués, stéréo.",
    description:
      "L'accessoire que l'on cherche toujours au mauvais moment. Corps métallique plutôt que plastique moulé : il supporte le poids d'un câble de casque sans jouer dans la prise.",
    priceCents: 900,
    stock: 60,
    categorySlug: "cables",
    tags: ["adaptateur", "nomade"],
    specs: [
      { label: "Type", value: "Jack 6,35 mm femelle vers 3,5 mm mâle" },
      { label: "Câblage", value: "Stéréo TRS" },
      { label: "Corps", value: "Métal" },
    ],
  },

  // --- Accessoires ---------------------------------------------------------
  {
    slug: "woo-audio-hps-r",
    title: "Support de casque HPS-R",
    brand: "Woo Audio",
    summary: "Aluminium usiné, arceau large qui ne marque pas le bandeau.",
    description:
      "Le rayon de l'appui est assez large pour ne pas creuser le rembourrage du bandeau, ce que font la plupart des crochets étroits. Base lestée, revêtement antidérapant, montage en deux pièces.",
    priceCents: 12900,
    stock: 9,
    categorySlug: "accessoires",
    tags: ["support", "bureau"],
    specs: [
      { label: "Matériau", value: "Aluminium usiné" },
      { label: "Hauteur", value: "28 cm" },
      { label: "Base", value: "Lestée, revêtement antidérapant" },
    ],
  },
  {
    slug: "dekoni-elite-velours-hd600",
    title: "Coussinets Elite Velours pour série HD 600",
    brand: "Dekoni",
    summary: "Mousse à mémoire de forme, compatibles HD 600, 650, 660S et 660S2.",
    description:
      "Les coussinets d'origine se tassent au bout de deux ou trois ans et le rendu change avec eux. Ces coussinets restaurent l'épaisseur d'origine ; le velours conserve la respiration du casque sans fermer le haut du spectre.",
    priceCents: 9900,
    stock: 14,
    categorySlug: "accessoires",
    tags: ["coussinets", "entretien"],
    specs: [
      { label: "Compatibilité", value: "Sennheiser HD 600, 650, 660S, 660S2" },
      { label: "Matériau", value: "Velours et mousse à mémoire de forme" },
      { label: "Vendu par", value: "Paire" },
    ],
  },
  {
    slug: "isoacoustics-iso-155",
    title: "Pieds d'enceinte ISO-155, la paire",
    brand: "IsoAcoustics",
    summary: "Découplage mécanique, inclinaison réglable, pour moniteurs jusqu'à 16 kg.",
    description:
      "Le découplage réduit la transmission des vibrations au meuble, ce qui nettoie surtout le bas-médium sur un bureau. L'inclinaison permet d'orienter l'axe du tweeter vers l'oreille plutôt que vers le torse.",
    priceCents: 12900,
    stock: 8,
    categorySlug: "accessoires",
    tags: ["decouplage", "studio", "bureau"],
    specs: [
      { label: "Charge maximale", value: "16 kg par pied" },
      { label: "Hauteurs", value: "Quatre positions" },
      { label: "Inclinaison", value: "Réglable" },
      { label: "Vendu par", value: "Paire" },
    ],
  },
  {
    slug: "moondrop-boitier-rangement",
    title: "Boîtier de rangement pour intras",
    brand: "Moondrop",
    summary: "Coque rigide, intérieur doublé, compartiment à embouts.",
    description:
      "Un intra passe sa vie dans une poche ou un sac ; la coque rigide évite les câbles pincés et les embouts perdus. Le compartiment interne sépare les embouts de rechange du câble.",
    priceCents: 2900,
    stock: 27,
    categorySlug: "accessoires",
    tags: ["rangement", "nomade"],
    specs: [
      { label: "Type", value: "Coque rigide" },
      { label: "Dimensions", value: "95 x 75 x 40 mm" },
      { label: "Intérieur", value: "Doublé, compartiment à embouts" },
    ],
  },
  {
    slug: "schiit-sys",
    title: "Sys",
    brand: "Schiit",
    summary: "Sélecteur deux entrées et atténuateur passif, sans alimentation.",
    description:
      "Deux sources vers une sortie, avec un potentiomètre passif. Aucun circuit actif, donc aucun bruit ajouté et aucune alimentation à trouver. Pratique entre un convertisseur et des moniteurs actifs dépourvus de réglage en façade.",
    priceCents: 5900,
    stock: 13,
    categorySlug: "accessoires",
    tags: ["commutation", "bureau"],
    specs: [
      { label: "Entrées", value: "Deux paires RCA" },
      { label: "Sortie", value: "Une paire RCA" },
      { label: "Atténuation", value: "Potentiomètre passif" },
      { label: "Alimentation", value: "Aucune" },
    ],
  },
];
