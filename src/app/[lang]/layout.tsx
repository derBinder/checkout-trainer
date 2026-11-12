import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeSync } from "@/components/theme/theme-sync";
import { I18nProvider } from "@/i18n/client";
import { LOCALES } from "@/i18n/locales";
import { getLocale } from "@/i18n/server";
import { THEME_COLORS, themeInitScript } from "@/lib/theme";
import "../globals.css";

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

// Beide Sprachen werden vorgerendert; mit Cache Components braucht jeder
// Root-Parameter mindestens einen Wert.
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    // data-theme setzt das Skript vor dem ersten Zeichnen, daher suppressHydrationWarning.
    <html lang={locale} className={archivo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <ThemeSync />
        <I18nProvider locale={locale}>{children}</I18nProvider>
        {/* Vercel Web Analytics und Speed Insights: senden nur in der Bereitstellung bei Vercel Daten, lokal nicht. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
