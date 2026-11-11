import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { ThemeSync } from "@/components/theme/theme-sync";
import { THEME_COLORS, themeInitScript } from "@/lib/theme";
import "./globals.css";

// Eine Schrift für alles: Archivo als variable Schrift mit Breitenachse, beim Build geladen und selbst ausgeliefert.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Checkout-Trainer",
  description: "Checkout-Wege im Darts mit Karteikarten lernen.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  // Folgt ohne JavaScript dem System. Bei fester Wahl setzt themeInitScript eine eigene Zeile davor.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-theme setzt das Skript vor dem ersten Zeichnen, daher suppressHydrationWarning.
    <html lang="de" className={archivo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
