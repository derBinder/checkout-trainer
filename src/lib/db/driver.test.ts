import { afterEach, describe, expect, it, vi } from "vitest";
import { createPgPool, resolveDbTarget, withVerifiedSsl } from "./driver";

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

  it("bricht auf Vercel zur Laufzeit ohne DATABASE_URL mit klarer Meldung ab", () => {
    expect(() => resolveDbTarget({ VERCEL: "1" })).toThrow(/DATABASE_URL/);
  });

  it("lässt auf Vercel den Build ohne DATABASE_URL im Arbeitsspeicher laufen", () => {
    expect(resolveDbTarget({ VERCEL: "1", NEXT_PHASE: build })).toEqual({
      driver: "pglite",
      location: undefined,
    });
  });

  it("nutzt auf Vercel mit DATABASE_URL pg", () => {
    const url = "postgres://example.test/db";
    expect(resolveDbTarget({ VERCEL: "1", DATABASE_URL: url })).toEqual({ driver: "pg", url });
  });
});

describe("withVerifiedSsl", () => {
  it.each(["require", "prefer", "verify-ca"])("macht aus sslmode=%s verify-full", (mode) => {
    expect(
      withVerifiedSsl(`postgresql://u:p@host.neon.tech/db?sslmode=${mode}&channel_binding=require`),
    ).toBe("postgresql://u:p@host.neon.tech/db?sslmode=verify-full&channel_binding=require");
  });

  it("lässt Adressen ohne sslmode und mit anderen Modi unverändert", () => {
    for (const url of [
      "postgres://example.test/db",
      "postgres://example.test/db?sslmode=verify-full",
      "postgres://example.test/db?sslmode=disable",
      "postgres://example.test/db?uselibpqcompat=true&sslmode=require",
    ]) {
      expect(withVerifiedSsl(url)).toBe(url);
    }
  });

  it("wird von resolveDbTarget angewendet", () => {
    expect(resolveDbTarget({ DATABASE_URL: "postgres://example.test/db?sslmode=require" })).toEqual({
      driver: "pg",
      url: "postgres://example.test/db?sslmode=verify-full",
    });
  });
});

describe("createPgPool", () => {
  afterEach(() => vi.restoreAllMocks());

  it("protokolliert den Fehler einer ruhenden Verbindung, statt den Prozess zu beenden", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    // Verbindet erst bei der ersten Abfrage; hier wird keine aufgebaut.
    const pool = createPgPool("postgres://u:p@127.0.0.1:1/db");
    const error = new Error("Connection terminated unexpectedly");

    // So meldet pg-pool eine abgebrochene ruhende Verbindung; ohne Zuhörer wirft emit.
    expect(() => pool.emit("error", error)).not.toThrow();
    expect(log).toHaveBeenCalledWith(expect.any(String), error);
    await pool.end();
  });
});
