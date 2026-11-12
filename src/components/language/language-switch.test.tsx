// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/locales";
import { LanguageSwitch } from "./language-switch";

const push = vi.fn();
const usePathname = vi.fn(() => "/de/settings");
vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
  useRouter: () => ({ push }),
}));

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
  push.mockClear();
  usePathname.mockReturnValue("/de/settings");
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
    expect(push).toHaveBeenCalledWith("/en/settings");
  });

  it("wechselt in der kompakten Form von der Startseite", async () => {
    const user = userEvent.setup();
    usePathname.mockReturnValue("/en");
    renderSwitch("en", "compact");
    await user.click(screen.getByText("DE"));
    expect(document.cookie).toContain("lang=de");
    expect(push).toHaveBeenCalledWith("/de");
  });
});
