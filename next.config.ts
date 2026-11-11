import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` soll die eingecheckte AGENTS.md nicht bei jedem Start neu schreiben.
  agentRules: false,
  // PGlite lädt seine WASM-Dateien zur Laufzeit von der Platte; gebündelt
  // durch webpack findet es sie nicht mehr.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
