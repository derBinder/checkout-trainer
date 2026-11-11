import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite lädt seine WASM-Dateien zur Laufzeit von der Platte; gebündelt
  // durch webpack findet es sie nicht mehr.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
