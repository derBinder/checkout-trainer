import { describe, expect, it } from "vitest";
import { resolveDbTarget } from "./driver";

const build = "phase-production-build";

describe("resolveDbTarget", () => {
  it("nutzt im Build ohne DATABASE_URL PGlite im Arbeitsspeicher", () => {
    expect(resolveDbTarget({ NEXT_PHASE: build })).toEqual({
      driver: "pglite",
      location: undefined,
    });
  });

  it("nutzt zur Laufzeit ohne DATABASE_URL das Verzeichnis .data/pglite", () => {
    expect(resolveDbTarget({})).toEqual({
      driver: "pglite",
      location: ".data/pglite",
    });
    expect(resolveDbTarget({ NEXT_PHASE: "phase-development-server" })).toEqual({
      driver: "pglite",
      location: ".data/pglite",
    });
  });

  it("nutzt mit DATABASE_URL in jeder Phase pg", () => {
    const url = "postgres://example.test/db";
    expect(resolveDbTarget({ DATABASE_URL: url })).toEqual({ driver: "pg", url });
    expect(resolveDbTarget({ DATABASE_URL: url, NEXT_PHASE: build })).toEqual({
      driver: "pg",
      url,
    });
  });
});
