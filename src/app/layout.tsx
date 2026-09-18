import type { Metadata } from "next";
import { Archivo } from "next/font/google";
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
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
