import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Backend: reine Logik, Datenbank, Auth, Server Actions und Route Handler.
const BACKEND = "{src/lib/**,src/proxy.ts,src/app/api/**,src/app/**/*.ts}";
// Frontend: Komponenten und Seiten.
const FRONTEND = "{src/components/**,src/app/**/*.tsx}";
const MIN = { lines: 80, statements: 80, branches: 80, functions: 80 };

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next löst server-only im Bau selbst auf; in Tests ist es ein leeres Modul.
      "server-only": fileURLToPath(new URL("./vitest.server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Der erste createTestDb()-Aufruf je Testdatei startet und migriert PGlite; das
    // braucht unter Last (Coverage, parallele Läufe) mehrere Sekunden. Liegt er im
    // Testkörper, liefe er sonst in die 5 s. Spätere Aufrufe klonen nur.
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
