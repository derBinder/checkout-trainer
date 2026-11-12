import { describe, expect, it } from "vitest";
import { loadsToRecord, nextLoad } from "./study-load";

const load = (loadId: string) => ({ loadId, items: [loadId] });

describe("nextLoad", () => {
  it("startet beim Einhängen mit einer frischen Ladung vom Server", () => {
    const incoming = load("a");
    expect(nextLoad(null, incoming, new Set())).toBe(incoming);
  });

  it("behält die laufende Sitzung, wenn der Server die Seite neu rendert (Server Action)", () => {
    const running = load("a");
    expect(nextLoad(running, load("b"), new Set(["a"]))).toBe(running);
  });

  it("verwirft eine Ladung, mit der schon eine Sitzung lief (aus dem Zurück-Cache)", () => {
    expect(nextLoad(null, load("a"), new Set(["a"]))).toBeNull();
  });

  it("startet nach dem Neuladen mit der neuen Ladung", () => {
    const fresh = load("b");
    expect(nextLoad(null, fresh, new Set(["a"]))).toBe(fresh);
  });
});

describe("loadsToRecord", () => {
  it("merkt sich die erste Ladung, mit der die Sitzung startet", () => {
    const first = load("a");
    expect(loadsToRecord(first, first)).toEqual(["a"]);
  });

  it("merkt sich auch eine Ladung, die während der Sitzung ankommt; sie startet später keine Sitzung", () => {
    const used = new Set(loadsToRecord(load("a"), load("b")));
    expect(used).toEqual(new Set(["a", "b"]));
    expect(nextLoad(null, load("b"), used)).toBeNull();
  });

  it("merkt sich nichts, solange keine Sitzung läuft", () => {
    expect(loadsToRecord(null, load("a"))).toEqual([]);
  });

  it("eine frische Ladung nach dem Neueinhängen startet weiterhin eine Sitzung", () => {
    const used = new Set(loadsToRecord(load("a"), load("b")));
    const fresh = load("c");
    expect(nextLoad(null, fresh, used)).toBe(fresh);
  });
});
