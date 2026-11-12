// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function renderSync() {
  // theme-store merkt sich die Wahl im Modul: je Test frisch laden.
  vi.resetModules();
  const { ThemeSync } = await import("./theme-sync");
  return render(<ThemeSync />);
}

function theme() {
  return document.documentElement.getAttribute("data-theme");
}

function themeColor() {
  return document.getElementById("theme-color-choice")?.getAttribute("content") ?? null;
}

function changeInOtherTab(value: string | null) {
  if (value === null) localStorage.removeItem("theme");
  else localStorage.setItem("theme", value);
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key: "theme", newValue: value }));
  });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.head.innerHTML = "";
});

describe("ThemeSync", () => {
  it("rendert nichts Sichtbares", async () => {
    const { container } = await renderSync();
    expect(container.innerHTML).toBe("");
  });

  it("setzt die gespeicherte Darstellung nach dem Laden erneut", async () => {
    localStorage.setItem("theme", "dark");
    await renderSync();
    expect(theme()).toBe("dark");
    expect(themeColor()).toBe("#0b0b0c");
  });

  it("lässt die Seite bei System dem Gerät folgen", async () => {
    document.documentElement.setAttribute("data-theme", "light");
    await renderSync();
    expect(theme()).toBeNull();
    expect(themeColor()).toBeNull();
  });

  it("übernimmt Wechsel aus anderen Tabs", async () => {
    await renderSync();
    changeInOtherTab("light");
    expect(theme()).toBe("light");
    expect(themeColor()).toBe("#ffffff");
    changeInOtherTab(null);
    expect(theme()).toBeNull();
    expect(themeColor()).toBeNull();
  });

  it("hört nach dem Aushängen nicht mehr auf Wechsel", async () => {
    const { unmount } = await renderSync();
    unmount();
    changeInOtherTab("dark");
    expect(theme()).toBeNull();
  });
});
