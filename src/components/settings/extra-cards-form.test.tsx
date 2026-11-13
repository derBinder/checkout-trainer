// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/locales";
import { NO_EXTRA_CARDS, type ExtraCards } from "@/lib/extra-cards";

const updateExtraCards = vi.hoisted(() => vi.fn());
vi.mock("@/app/[lang]/(app)/settings/actions", () => ({ updateExtraCards }));

const { ExtraCardsSwitches } = await import("./extra-cards-form");

function renderSwitches(initial: ExtraCards = NO_EXTRA_CARDS, locale: Locale = "de") {
  return render(<ExtraCardsSwitches initial={initial} />, {
    wrapper: ({ children }) => <I18nProvider locale={locale}>{children}</I18nProvider>,
  });
}

const toggle = (name: string) => screen.getByRole("switch", { name });
const isOn = (name: string) => toggle(name).getAttribute("aria-checked") === "true";

/** Ein Versprechen, das der Test von außen auflöst. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  updateExtraCards.mockReset();
});

describe("ExtraCardsSwitches", () => {
  it("zeigt drei Schalter mit Kartenzahl im gespeicherten Zustand", () => {
    renderSwitches({ singleDouble: false, neighbours: true, over170: false });
    expect(screen.getAllByRole("switch")).toHaveLength(3);
    expect(isOn("Single statt Doppel")).toBe(false);
    expect(isOn("Nachbarfelder")).toBe(true);
    expect(isOn("Reste über 170")).toBe(false);
    expect(toggle("Single statt Doppel").getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("19 Karten: Doppel verfehlt, Single getroffen.")).toBeTruthy();
    expect(screen.getByText("202 Karten: S1 oder S5 statt T20, S7 oder S3 statt T19.")).toBeTruthy();
    expect(screen.getByText("60 Karten: Stellwurf mit drei Darts von 171 bis 230.")).toBeTruthy();
  });

  it("speichert beim Umlegen und bestätigt", async () => {
    updateExtraCards.mockResolvedValue({ ok: true });
    renderSwitches();
    await userEvent.setup().click(toggle("Nachbarfelder"));
    expect(updateExtraCards).toHaveBeenCalledWith("neighbours", true);
    expect((await screen.findByRole("status")).textContent).toBe("Gespeichert.");
    expect(isOn("Nachbarfelder")).toBe(true);
  });

  it("schaltet auch über einen Tipp auf die Beschriftung", async () => {
    updateExtraCards.mockResolvedValue({ ok: true });
    renderSwitches({ ...NO_EXTRA_CARDS, over170: true });
    await userEvent.setup().click(screen.getByText("Reste über 170"));
    expect(updateExtraCards).toHaveBeenCalledWith("over170", false);
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(isOn("Reste über 170")).toBe(false);
  });

  it("sperrt die Schalter, solange gespeichert wird", async () => {
    const save = deferred<{ ok: true }>();
    updateExtraCards.mockReturnValue(save.promise);
    const user = userEvent.setup();
    renderSwitches();
    await user.click(toggle("Single statt Doppel"));
    expect(isOn("Single statt Doppel")).toBe(true);
    await user.click(toggle("Single statt Doppel"));
    await user.click(toggle("Reste über 170"));
    expect(updateExtraCards).toHaveBeenCalledTimes(1);
    await act(async () => save.resolve({ ok: true }));
    expect(isOn("Single statt Doppel")).toBe(true);
    expect(screen.getByRole("status").textContent).toBe("Gespeichert.");
  });

  it("springt zurück und meldet einen Fehler, wenn nicht gespeichert wurde", async () => {
    updateExtraCards.mockResolvedValue({ ok: false });
    renderSwitches();
    await userEvent.setup().click(toggle("Nachbarfelder"));
    expect((await screen.findByRole("alert")).textContent).toBe("Das hat nicht geklappt. Versuche es erneut.");
    expect(isOn("Nachbarfelder")).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("springt zurück ohne Verbindung", async () => {
    updateExtraCards.mockRejectedValue(new Error("offline"));
    renderSwitches({ ...NO_EXTRA_CARDS, neighbours: true });
    await userEvent.setup().click(toggle("Nachbarfelder"));
    expect((await screen.findByRole("alert")).textContent).toBe("Keine Verbindung. Versuche es erneut.");
    expect(isOn("Nachbarfelder")).toBe(true);
  });

  it("vergisst die Rückmeldung, wenn die Seite verborgen wird", async () => {
    updateExtraCards.mockResolvedValue({ ok: true });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <I18nProvider locale="de">{children}</I18nProvider>
    );
    const { rerender } = render(
      <Activity mode="visible">
        <ExtraCardsSwitches initial={NO_EXTRA_CARDS} />
      </Activity>,
      { wrapper },
    );
    await userEvent.setup().click(toggle("Nachbarfelder"));
    expect(await screen.findByRole("status")).toBeTruthy();
    rerender(
      <Activity mode="hidden">
        <ExtraCardsSwitches initial={NO_EXTRA_CARDS} />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <ExtraCardsSwitches initial={NO_EXTRA_CARDS} />
      </Activity>,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(isOn("Nachbarfelder")).toBe(true);
  });

  it("spricht Englisch", () => {
    renderSwitches(NO_EXTRA_CARDS, "en");
    expect(toggle("Single instead of double")).toBeTruthy();
    expect(toggle("Neighbouring fields")).toBeTruthy();
    expect(toggle("Scores above 170")).toBeTruthy();
    expect(screen.getByText("60 cards: setup shot with three darts from 171 to 230.")).toBeTruthy();
  });
});
