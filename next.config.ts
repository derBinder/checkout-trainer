import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vorgerendertes Gerüst beim Klick, Nutzerdaten streamen hinter Suspense nach.
  cacheComponents: true,
  partialPrefetching: true,
  // PGlite lädt seine WASM-Dateien zur Laufzeit von der Platte; gebündelt
  // durch webpack findet es sie nicht mehr.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
