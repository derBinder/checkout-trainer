import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Backend: reine Logik, Datenbank, Auth, Server Actions und Route Handler.
const BACKEND = "{src/lib/**,src/proxy.ts,src/app/api/**,src/app/**/*.ts}";
// Frontend: Komponenten und Seiten.
const FRONTEND = "{src/components/**,src/app/**/*.tsx}";
const MIN = { lines: 80, statements: 80, branches: 80, functions: 80 };

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    // Die vollständigen Durchläufe über alle Reste (scoring.test.ts) brauchen
    // parallel und mit Coverage-Messung mehr als die voreingestellten 5 Sekunden.
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}"],
      reporter: ["text-summary", "html"],
      thresholds: { [BACKEND]: MIN, [FRONTEND]: MIN },
    },
  },
});
