// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function renderSwitch() {
  // theme-store merkt sich die Wahl im Modul: je Test frisch laden.
  vi.resetModules();
  const { ThemeSwitch } = await import("./theme-switch");
  render(
    <>
      <span id="theme-label">Darstellung</span>
      <ThemeSwitch labelledBy="theme-label" />
    </>,
  );
}

function radio(name: string) {
  return screen.getByRole("radio", { name }) as HTMLInputElement;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.head.innerHTML = "";
});

describe("ThemeSwitch", () => {
  it("bietet System, Hell und Dunkel an und wählt ohne Speicher System", async () => {
    await renderSwitch();
    expect(screen.getByRole("radiogroup", { name: "Darstellung" })).toBeTruthy();
    expect(screen.getAllByRole("radio").map((r) => r.getAttribute("value"))).toEqual([
      "system",
      "light",
      "dark",
    ]);
    expect(radio("System").checked).toBe(true);
  });

  it("wählt beim Vorrendern auf dem Server System, auch wenn etwas gespeichert ist", async () => {
    localStorage.setItem("theme", "dark");
    vi.resetModules();
    const { ThemeSwitch } = await import("./theme-switch");
    const html = renderToString(<ThemeSwitch labelledBy="theme-label" />);
    const container = document.createElement("div");
    container.innerHTML = html;
    const checked = container.querySelector<HTMLInputElement>("input:checked");
    expect(checked?.value).toBe("system");
  });

  it("zeigt die gespeicherte Wahl", async () => {
    localStorage.setItem("theme", "light");
    await renderSwitch();
    expect(radio("Hell").checked).toBe(true);
  });

  it("speichert und übernimmt eine neue Wahl sofort", async () => {
    const user = userEvent.setup();
    await renderSwitch();
    await user.click(screen.getByText("Dunkel"));
    expect(radio("Dunkel").checked).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await user.click(screen.getByText("System"));
    expect(radio("System").checked).toBe(true);
    expect(localStorage.getItem("theme")).toBeNull();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("folgt einer Wahl aus einem anderen Tab", async () => {
    await renderSwitch();
    localStorage.setItem("theme", "dark");
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "theme", newValue: "dark" }));
    });
    expect(radio("Dunkel").checked).toBe(true);
  });
});
