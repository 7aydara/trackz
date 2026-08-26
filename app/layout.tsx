import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { TimezoneSync } from "@/components/TimezoneSync";
import "./globals.css";

// Nunito Sans : terminaisons arrondies, et des graisses lourdes (800/900)
// disponibles pour les titres, qui portent la personnalite de l'interface.
const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trackz — ma suite perso",
  description:
    "Habit tracker central + business freelance, dossiers ecoles, suivi des cours et Kung Fu Shaolin.",
  manifest: "/manifest.webmanifest",
  applicationName: "Trackz",
  // Sur iOS, les notifications push ne fonctionnent que depuis une app
  // ajoutee a l'ecran d'accueil : ces metadonnees rendent l'ajout propre.
  appleWebApp: {
    capable: true,
    title: "Trackz",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  // La barre du navigateur suit le theme : violet clair d'un cote,
  // obsidienne de l'autre.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7fd" },
    { media: "(prefers-color-scheme: dark)", color: "#131217" },
  ],
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={nunito.variable}>
      <body className="font-sans antialiased">
        <TimezoneSync />
        {children}
      </body>
    </html>
  );
}
