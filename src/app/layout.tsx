import type { Metadata } from "next";
import { Archivo } from "next/font/google";

import { env } from "@/lib/env";

import { FooterWithCategories } from "@/components/layout/footer-categories";
import { HeaderShell } from "@/components/layout/header-shell";
import { WishlistProvider } from "@/components/product/wishlist-state";
import { Toaster } from "@/components/ui/toaster";

import "./globals.css";

/**
 * Une seule famille pour tout le site (P1.3).
 *
 * Archivo est variable sur deux axes : la graisse et la **chasse** (`wdth`).
 * C'est la chasse qui porte le registre « display » des grands titres, ce qui
 * évite d'embarquer une seconde police uniquement pour le hero.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  /**
   * Sans `metadataBase`, les URL Open Graph restent relatives et aucun réseau
   * social ne sait les résoudre : l'aperçu part sans image (P10.4).
   */
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "Tynoc, audio et matériel d'écoute",
    template: "%s · Tynoc",
  },
  description:
    "Casques, enceintes, convertisseurs et accessoires choisis pour leurs mesures autant que pour leur écoute.",
  openGraph: {
    type: "website",
    siteName: "Tynoc",
    locale: "fr_FR",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* En-tête et pied de page lisent un catalogue mis en cache : ils
            entrent donc dans la coquille statique. Seuls les compteurs, qui
            dépendent de la session, arrivent en flux, derrière leur propre
            frontière à l'intérieur de l'en-tête. */}
        <HeaderShell />

        {/* Le fournisseur est client, ses enfants restent rendus par le
            serveur : ils lui sont passés en propriété, pas importés. */}
        <WishlistProvider>
          <main id="contenu" className="flex-1">
            {children}
          </main>
        </WishlistProvider>

        <FooterWithCategories />

        <Toaster />
      </body>
    </html>
  );
}
