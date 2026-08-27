import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { TimezoneSync } from "@/components/TimezoneSync";
import "./globals.css";

// Manrope : geometrique, un peu serree, des chiffres qui s'alignent.
// Assez neutre pour disparaitre, assez dessinee pour ne pas faire generique.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
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
    statusBarStyle: "black-translucent",
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
  themeColor: "#0a0a0c",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={manrope.variable}>
      <body className="font-sans antialiased">
        {/* Degrade du mercure, defini une fois : les anneaux de progression
            le referencent par `url(#mercury-stroke)`. Un seul <defs> evite
            de dupliquer un identifiant a chaque instance. */}
        <svg aria-hidden width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="mercury-stroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="12%" stopColor="#c3c7cf" />
              <stop offset="24%" stopColor="#6c7078" />
              <stop offset="36%" stopColor="#eceef2" />
              <stop offset="46%" stopColor="#ffffff" />
              <stop offset="58%" stopColor="#9ba1ab" />
              <stop offset="70%" stopColor="#494d55" />
              <stop offset="82%" stopColor="#d4d8df" />
              <stop offset="94%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#7f858e" />
            </linearGradient>
          </defs>
        </svg>
        <TimezoneSync />
        {children}
      </body>
    </html>
  );
}
