import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trackz — ma suite perso",
  description:
    "Habit tracker central + business freelance, dossiers ecoles, suivi des cours et Kung Fu Shaolin.",
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={nunito.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
