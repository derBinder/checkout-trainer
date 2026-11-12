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
    // PGlite braucht unter Last (Coverage, parallele Läufe) mehrere Sekunden zum Start;
    // Tests, die ihre Datenbank im Testkörper anlegen, liefen sonst in die 5 s.
    testTimeout: 15_000,
    hookTimeout: 20_000,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      // test-db.ts ist eine Testhilfe und läuft nie in der App.
      exclude: ["src/**/*.test.{ts,tsx}", "src/lib/db/test-db.ts"],
      reporter: ["text-summary", "html"],
      thresholds: { [BACKEND]: MIN, [FRONTEND]: MIN },
    },
  },
});
