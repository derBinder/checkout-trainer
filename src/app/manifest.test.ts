import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { THEME_COLORS } from "@/lib/theme";
import manifest from "./manifest";

describe("manifest", () => {
  it("startet als eigenständige App im Scope der ganzen Seite", () => {
    const m = manifest();
    expect(m.display).toBe("standalone");
    expect(m.scope).toBe("/");
    expect(m.start_url).toBe("/");
  });

  it("nennt App-Icons, die mit der genannten Größe unter public/ liegen", () => {
    const icons = manifest().icons ?? [];
    expect(icons.map((i) => [i.src, i.sizes, i.purpose])).toEqual([
      ["/icon-192.png", "192x192", "any"],
      ["/icon-512.png", "512x512", "any"],
      ["/icon-maskable-512.png", "512x512", "maskable"],
    ]);
    for (const icon of icons) {
      const png = readFileSync(join(process.cwd(), "public", icon.src));
      // PNG-Kopf: Breite und Höhe stehen als 32-Bit-Zahlen ab Byte 16 und 20.
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    }
  });

  it("startet auf schwarzem Grund wie das Icon", () => {
    expect(manifest().background_color).toBe(THEME_COLORS.dark);
  });
});
