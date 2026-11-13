import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SELECTION, type PracticeSelection } from "@/lib/practice/selection";

/** Gerade so viel Browser, wie selection-store.ts anfasst. */
function fakeBrowser({ storageThrows }: { storageThrows: boolean }) {
  const stored = new Map<string, string>();
  const blocked = () => {
    throw new Error("SecurityError");
  };
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("localStorage", {
    getItem: storageThrows ? blocked : (k: string) => stored.get(k) ?? null,
    setItem: storageThrows ? blocked : (k: string, v: string) => void stored.set(k, v),
  });
  return stored;
}

const MATH: PracticeSelection = { exercise: "math", ranges: ["2-40"], kind: "misses" };

// Das Modul merkt sich die Wahl im Tab: je Test frisch laden.
async function load() {
  vi.resetModules();
  return import("./selection-store");
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("selection-store", () => {
  it("liest die Vorauswahl, solange nichts gespeichert ist", async () => {
    fakeBrowser({ storageThrows: false });
    const { readPracticeSelection } = await load();
    expect(readPracticeSelection()).toEqual(DEFAULT_SELECTION);
  });

  it("speichert die Wahl und liest sie zurück", async () => {
    const stored = fakeBrowser({ storageThrows: false });
    const { readPracticeSelection, savePracticeSelection } = await load();
    savePracticeSelection(MATH);
    expect(JSON.parse(stored.get("practice")!)).toEqual(MATH);
    expect(readPracticeSelection()).toEqual(MATH);
  });

  it("prüft den gespeicherten Wert beim Lesen", async () => {
    const stored = fakeBrowser({ storageThrows: false });
    stored.set("practice", JSON.stringify({ exercise: "math", ranges: ["999", "61-80"], kind: "x" }));
    const { readPracticeSelection } = await load();
    expect(readPracticeSelection()).toEqual({ exercise: "math", ranges: ["61-80"], kind: "all" });
  });

  it("liefert bei unverändertem Speicher dieselbe Referenz", async () => {
    const stored = fakeBrowser({ storageThrows: false });
    stored.set("practice", JSON.stringify(MATH));
    const { readPracticeSelection } = await load();
    expect(readPracticeSelection()).toBe(readPracticeSelection());
  });

  it("nimmt bei gesperrtem Speicher die Vorauswahl und hält eine Wahl bis zum Neuladen", async () => {
    fakeBrowser({ storageThrows: true });
    const { readPracticeSelection, savePracticeSelection } = await load();
    expect(readPracticeSelection()).toEqual(DEFAULT_SELECTION);
    savePracticeSelection(MATH);
    expect(readPracticeSelection()).toEqual(MATH);
  });

  it("meldet eigene Wahl und Änderungen aus anderen Tabs", async () => {
    const stored = fakeBrowser({ storageThrows: false });
    const { readPracticeSelection, savePracticeSelection, subscribePracticeSelection } = await load();
    const onChange = vi.fn();
    const unsubscribe = subscribePracticeSelection(onChange);
    savePracticeSelection(MATH);
    expect(onChange).toHaveBeenCalledTimes(1);

    // Ein anderer Tab speichert: dessen Wert gilt, nicht mehr die Wahl dieses Tabs.
    const other = { exercise: "routes", ranges: ["41-60"], kind: "ways" };
    stored.set("practice", JSON.stringify(other));
    const event = Object.assign(new Event("storage"), { key: "practice" });
    window.dispatchEvent(event);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(readPracticeSelection()).toEqual(other);

    window.dispatchEvent(Object.assign(new Event("storage"), { key: "theme" }));
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    savePracticeSelection(DEFAULT_SELECTION);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
