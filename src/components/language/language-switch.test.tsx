// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/locales";
import { LanguageSwitch } from "./language-switch";

const assign = vi.fn();

function setLocation(path: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      pathname: new URL(path, "http://localhost").pathname,
      search: new URL(path, "http://localhost").search,
      hash: new URL(path, "http://localhost").hash,
      assign,
    },
  });
}

function renderSwitch(locale: Locale, variant: "settings" | "compact") {
  render(
    <I18nProvider locale={locale}>
      <span id="lang-label">Sprache</span>
      <LanguageSwitch variant={variant} labelledBy="lang-label" />
    </I18nProvider>,
  );
}

function radio(name: string) {
  return screen.getByRole("radio", { name }) as HTMLInputElement;
}

beforeEach(() => {
  assign.mockClear();
  setLocation("/de/settings?a=1#x");
  document.cookie = "lang=; path=/; max-age=0";
});

describe("LanguageSwitch", () => {
  it("wählt bei deutscher Adresse Deutsch", () => {
    renderSwitch("de", "settings");
    expect(radio("Deutsch").checked).toBe(true);
    expect(radio("English").checked).toBe(false);
  });

  it("wählt bei englischer Adresse English, die Namen bleiben gleich", () => {
    renderSwitch("en", "settings");
    expect(radio("English").checked).toBe(true);
    expect(radio("Deutsch").checked).toBe(false);
    expect(screen.getByRole("radiogroup", { name: "Sprache" })).toBeTruthy();
  });

  it("zeigt in der kompakten Form DE und EN mit ausgeschriebenen Namen", () => {
    renderSwitch("en", "compact");
    expect(screen.getByText("DE")).toBeTruthy();
    expect(screen.getByText("EN")).toBeTruthy();
    expect(radio("English").checked).toBe(true);
    expect(radio("Deutsch").checked).toBe(false);
  });

  it("setzt beim Wechsel das Cookie und wechselt die Adresse", async () => {
    const user = userEvent.setup();
    renderSwitch("de", "settings");
    await user.click(screen.getByText("English"));
    expect(document.cookie).toContain("lang=en");
    expect(assign).toHaveBeenCalledWith("/en/settings?a=1#x");
  });

  it("wechselt in der kompakten Form von der Startseite", async () => {
    const user = userEvent.setup();
    setLocation("/en");
    renderSwitch("en", "compact");
    await user.click(screen.getByText("DE"));
    expect(document.cookie).toContain("lang=de");
    expect(assign).toHaveBeenCalledWith("/de");
  });

  it("gibt jeder Instanz eine eigene Gruppe, damit versteckte Seiten keine Auswahl sperren", () => {
    render(
      <I18nProvider locale="de">
        <LanguageSwitch variant="compact" />
        <LanguageSwitch variant="settings" />
      </I18nProvider>,
    );
    const names = new Set(screen.getAllByRole("radio").map((r) => r.getAttribute("name")));
    expect(names.size).toBe(2);
  });

  it("kennzeichnet die Sprachnamen mit ihrer eigenen Sprache", () => {
    renderSwitch("en", "settings");
    expect(screen.getByText("Deutsch").getAttribute("lang")).toBe("de");
    expect(screen.getByText("English").getAttribute("lang")).toBe("en");
  });

  it("kennzeichnet in der kompakten Form Kürzel und ausgeschriebenen Namen", () => {
    renderSwitch("de", "compact");
    expect(screen.getByText("DE").getAttribute("lang")).toBe("de");
    expect(screen.getByText("EN").getAttribute("lang")).toBe("en");
    expect(screen.getByText("English").getAttribute("lang")).toBe("en");
    expect(screen.getByText("Deutsch").getAttribute("lang")).toBe("de");
  });

  it("gibt der kompakten Form eine mindestens 44 px hohe Tippfläche", () => {
    renderSwitch("de", "compact");
    expect(radio("English").closest("label")?.className).toContain("h-11");
  });
});
