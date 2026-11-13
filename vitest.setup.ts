import { afterEach, vi } from "vitest";

// Tests arbeiten nur mit createTestDb() (src/lib/db/test-db.ts). Ohne diesen Mock
// öffnet schon der Import von src/lib/auth (dort entsteht `auth = createAuth(db)`)
// die lokale Datenbank unter .data/pglite: aus mehreren Test-Workern gleichzeitig
// oder neben `next dev`/`next start`, und das bricht PGlite mit "Aborted()" ab.
vi.mock("@/lib/db", () => ({ db: {} }));

// next/root-params ersetzt erst der Next-Compiler; das Paket selbst wirft schon
// beim Import. Seiten und Datenbausteine lesen darüber die Sprache aus der URL,
// in Tests ist das Deutsch. Ein Test mit eigenem vi.mock überschreibt das.
vi.mock("next/root-params", () => ({ lang: async () => "de" }));

// Komponententests (`// @vitest-environment jsdom`): gerenderte Bäume nach jedem
// Test wieder aushängen, sonst sammeln sich die Knoten im gemeinsamen document.
// jsdom kennt kein Element.scrollTo; die Lernsitzung ruft es beim Kartenwechsel auf.
if (typeof document !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(cleanup);
  Element.prototype.scrollTo ??= () => {};
}
