import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = fileURLToPath(new URL("../../scripts/vercel-build.sh", import.meta.url));

// Stub-npx: protokolliert Aufruf und DATABASE_URL, scheitert bei `next build`
// auf Wunsch. So fasst der Test weder Netzwerk noch Datenbank an.
const STUB = `#!/bin/sh
echo "$* | DATABASE_URL=$DATABASE_URL" >> "$STUB_LOG"
if [ "$1 $2" = "next build" ] && [ -n "$STUB_FAIL_BUILD" ]; then exit 1; fi
`;

let dir: string;
let log: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vercel-build-"));
  log = join(dir, "calls.log");
  writeFileSync(log, "");
  writeFileSync(join(dir, "npx"), STUB);
  chmodSync(join(dir, "npx"), 0o755);
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

// Eigene Umgebung je Aufruf: Die Umgebung des Testprozesses bleibt unberührt
// (und trägt kein echtes VERCEL_ENV oder DATABASE_URL ins Skript).
function run(env: Record<string, string>) {
  const result = spawnSync("sh", [SCRIPT], {
    encoding: "utf8",
    env: { PATH: `${dir}:/usr/bin:/bin`, STUB_LOG: log, NODE_ENV: "test", ...env },
  });
  const calls = readFileSync(log, "utf8").split("\n").filter(Boolean);
  return { ...result, calls };
}

const PRODUCTION = {
  VERCEL_ENV: "production",
  DATABASE_URL_UNPOOLED: "postgres://direct",
  DATABASE_URL: "postgres://pooled",
  ADMIN_INITIAL_PASSWORD: "geheim-geheim",
};

describe("scripts/vercel-build.sh", () => {
  it("baut in Produktion zuerst, migriert danach über die direkte Adresse und legt den Betreiber an", () => {
    const { status, calls } = run(PRODUCTION);
    expect(status).toBe(0);
    expect(calls).toEqual([
      "next build | DATABASE_URL=postgres://pooled",
      "drizzle-kit migrate | DATABASE_URL=postgres://direct",
      "tsx scripts/seed-admin.ts | DATABASE_URL=postgres://direct",
    ]);
  });

  it("legt ohne Startpasswort keinen Betreiber an", () => {
    const { status, calls, stdout } = run({ ...PRODUCTION, ADMIN_INITIAL_PASSWORD: "" });
    expect(status).toBe(0);
    expect(calls.map((c) => c.split(" |")[0])).toEqual(["next build", "drizzle-kit migrate"]);
    expect(stdout).toContain("ADMIN_INITIAL_PASSWORD nicht gesetzt");
  });

  it("fasst die Datenbank nicht an, wenn der Bau scheitert", () => {
    const { status, calls } = run({ ...PRODUCTION, STUB_FAIL_BUILD: "1" });
    expect(status).not.toBe(0);
    expect(calls).toEqual(["next build | DATABASE_URL=postgres://pooled"]);
  });

  it("bricht in Produktion ohne DATABASE_URL_UNPOOLED sofort ab, auch ohne zu bauen", () => {
    const { status, calls, stderr } = run({ ...PRODUCTION, DATABASE_URL_UNPOOLED: "" });
    expect(status).toBe(1);
    expect(stderr).toContain("DATABASE_URL_UNPOOLED fehlt");
    expect(calls).toEqual([]);
  });

  it.each<Record<string, string>>([{ VERCEL_ENV: "preview" }, {}])("baut außerhalb der Produktion nur (%o)", (env) => {
    const { status, calls } = run({ ...env, DATABASE_URL_UNPOOLED: "postgres://direct" });
    expect(status).toBe(0);
    expect(calls).toEqual(["next build | DATABASE_URL="]);
  });
});
