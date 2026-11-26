import type { MetadataRoute } from "next";
import { THEME_COLORS } from "@/lib/theme";

// Ohne Manifest öffnet iOS die Homescreen-Verknüpfung nur beim Start ohne Browserleisten.
// scope "/" deckt beide Sprachen (/de, /en) ab; Seiten außerhalb des Scopes zeigen die Leiste.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Checkout-Trainer",
    short_name: "Checkout",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Schwarz wie das Icon, damit der Startbildschirm der installierten App dazu passt.
    background_color: THEME_COLORS.dark,
    theme_color: THEME_COLORS.light,
    // Erzeugt aus src/app/icon.svg mit npm run generate:icons.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
