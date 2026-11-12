import { afterEach, vi } from "vitest";

// Tests arbeiten nur mit createTestDb() (src/lib/db/test-db.ts). Ohne diesen Mock
// öffnet schon der Import von src/lib/auth (dort entsteht `auth = createAuth(db)`)
// die lokale Datenbank unter .data/pglite: aus mehreren Test-Workern gleichzeitig
// oder neben `next dev`/`next start`, und das bricht PGlite mit "Aborted()" ab.
vi.mock("@/lib/db", () => ({ db: {} }));

// Komponententests (`// @vitest-environment jsdom`): gerenderte Bäume nach jedem
// Test wieder aushängen, sonst sammeln sich die Knoten im gemeinsamen document.
if (typeof document !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(cleanup);
}
