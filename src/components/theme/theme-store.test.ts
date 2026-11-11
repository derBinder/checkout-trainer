import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Gerade so viel Browser, wie theme-store.ts anfasst. */
function fakeBrowser({ storageThrows }: { storageThrows: boolean }) {
  const stored = new Map<string, string>();
  const attrs = new Map<string, string>();
  const blocked = () => {
    throw new Error("SecurityError");
  };
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("localStorage", {
    getItem: storageThrows ? blocked : (k: string) => stored.get(k) ?? null,
    setItem: storageThrows ? blocked : (k: string, v: string) => void stored.set(k, v),
    removeItem: storageThrows ? blocked : (k: string) => void stored.delete(k),
  });
  type Meta = { id: string; name: string; content: string; remove: () => void };
  const head: Meta[] = [];
  vi.stubGlobal("document", {
    documentElement: {
      setAttribute: (k: string, v: string) => void attrs.set(k, v),
      removeAttribute: (k: string) => void attrs.delete(k),
    },
    getElementById: (id: string) => head.find((m) => m.id === id) ?? null,
    createElement: (): Meta => {
      const meta: Meta = { id: "", name: "", content: "", remove: () => void head.splice(head.indexOf(meta), 1) };
      return meta;
    },
    head: {
      get firstChild() {
        return head[0] ?? null;
      },
      prepend: (meta: Meta) => {
        if (head.includes(meta)) head.splice(head.indexOf(meta), 1);
        head.unshift(meta);
      },
    },
  });
  return {
    stored,
    theme: () => attrs.get("data-theme") ?? null,
    metas: () => head.map(({ id, name, content }) => ({ id, name, content })),
  };
}

async function loadStore() {
  vi.resetModules();
  return import("./theme-store");
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe("theme store with working storage", () => {
  it("saves, applies and reads back the choice", async () => {
    const browser = fakeBrowser({ storageThrows: false });
    const store = await loadStore();
    store.saveThemeSetting("dark");
    expect(browser.stored.get("theme")).toBe("dark");
    expect(browser.theme()).toBe("dark");
    expect(store.readThemeSetting()).toBe("dark");
    expect(browser.metas()).toEqual([{ id: "theme-color-choice", name: "theme-color", content: "#0b0b0c" }]);
    store.saveThemeSetting("light");
    expect(browser.metas()).toEqual([{ id: "theme-color-choice", name: "theme-color", content: "#ffffff" }]);
    store.saveThemeSetting("system");
    expect(browser.stored.has("theme")).toBe(false);
    expect(browser.theme()).toBeNull();
    expect(browser.metas()).toEqual([]);
  });

  it("follows a change made in another tab", async () => {
    const browser = fakeBrowser({ storageThrows: false });
    const store = await loadStore();
    store.saveThemeSetting("dark");
    const onChange = vi.fn();
    store.subscribeThemeSetting(onChange);
    browser.stored.set("theme", "light");
    window.dispatchEvent(Object.assign(new Event("storage"), { key: "theme" }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(store.readThemeSetting()).toBe("light");
  });
});

describe("theme store with blocked storage", () => {
  it("keeps the choice for this page view", async () => {
    const browser = fakeBrowser({ storageThrows: true });
    const store = await loadStore();
    expect(store.readThemeSetting()).toBe("system");
    // So reagiert ThemeSync: bei jeder Änderung neu lesen und anwenden.
    store.subscribeThemeSetting(() => store.applyThemeSetting(store.readThemeSetting()));
    store.saveThemeSetting("dark");
    expect(store.readThemeSetting()).toBe("dark");
    expect(browser.theme()).toBe("dark");
  });
});
