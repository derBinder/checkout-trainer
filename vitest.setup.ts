import { vi } from "vitest";

// Tests arbeiten nur mit createTestDb() (src/lib/db/test-db.ts). Ohne diesen Mock
// öffnet schon der Import von src/lib/auth (dort entsteht `auth = createAuth(db)`)
// die lokale Datenbank unter .data/pglite: aus mehreren Test-Workern gleichzeitig
// oder neben `next dev`/`next start`, und das bricht PGlite mit "Aborted()" ab.
vi.mock("@/lib/db", () => ({ db: {} }));
