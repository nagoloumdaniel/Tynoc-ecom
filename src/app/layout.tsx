import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Suspense } from "react";

import { FooterWithCategories } from "@/components/layout/footer-categories";
import { HeaderWithCounters } from "@/components/layout/header-counters";
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
  title: {
    default: "Tynoc, audio et matériel d'écoute",
    template: "%s · Tynoc",
  },
  description:
    "Casques, enceintes, convertisseurs et accessoires choisis pour leurs mesures autant que pour leur écoute.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* L'en-tête et le pied de page lisent la base et, pour l'en-tête, la
            session. Les isoler sous Suspense évite que la coquille entière
            attende ces lectures, et laisse la page s'afficher d'abord. */}
        <Suspense fallback={<div className="border-line-subtle h-14.25 border-b" />}>
          <HeaderWithCounters />
        </Suspense>

        <main id="contenu" className="flex-1">
          {children}
        </main>

        <Suspense fallback={null}>
          <FooterWithCategories />
        </Suspense>

        <Toaster />
      </body>
    </html>
  );
}
