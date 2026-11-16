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
    background_color: THEME_COLORS.light,
    theme_color: THEME_COLORS.light,
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
