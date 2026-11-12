import { describe, expect, it } from "vitest";
import { nextLoad } from "./study-load";

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
