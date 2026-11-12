// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { redirect } from "next/navigation";
import { Component, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const learnMoreCards = vi.hoisted(() => vi.fn());
vi.mock("@/app/[lang]/(app)/today/actions", () => ({ learnMoreCards }));

const { MoreCardsButton } = await import("./more-cards-button");

class Boundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    return this.state.error ? <p>Abgefangen</p> : this.props.children;
  }
}

async function clickButton() {
  const user = userEvent.setup();
  render(
    <Boundary>
      <MoreCardsButton />
    </Boundary>,
  );
  await user.click(screen.getByRole("button", { name: "Weitere 5 Karten lernen" }));
}

beforeEach(() => {
  learnMoreCards.mockReset();
});

// Stummgeschaltetes console.error auch nach einem fehlgeschlagenen Test zurücksetzen.
afterEach(() => {
  vi.restoreAllMocks();
});

describe("MoreCardsButton", () => {
  it("zeigt zunächst nur den Knopf ohne Hinweis", () => {
    render(<MoreCardsButton />);
    expect(screen.getByRole("button", { name: "Weitere 5 Karten lernen" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([
    ["auth", "Bitte melde dich erneut an."],
    ["inactive", "Dein Konto ist nicht freigeschaltet."],
    ["not-done", "Es warten noch Karten auf dich. Lade die Seite neu."],
    ["all-introduced", "Du hast alle Karten begonnen."],
    ["cap", "Für heute sind keine weiteren Karten möglich. Morgen geht es weiter."],
  ])("zeigt beim Grund %s die passende Meldung", async (reason, text) => {
    learnMoreCards.mockResolvedValue({ ok: false, reason });
    await clickButton();
    expect((await screen.findByRole("alert")).textContent).toBe(text);
    expect(learnMoreCards).toHaveBeenCalledOnce();
  });

  it("meldet eine fehlende Verbindung", async () => {
    learnMoreCards.mockRejectedValue(new Error("offline"));
    await clickButton();
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Keine Verbindung. Versuche es erneut.",
    );
  });

  it("sperrt den Knopf und zeigt den Fortschritt, solange die Anfrage läuft", async () => {
    let finish: (value: unknown) => void = () => {};
    learnMoreCards.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await clickButton();
    const button = await screen.findByRole("button", { name: "Karten werden vorbereitet …" });
    expect(button.hasAttribute("disabled")).toBe(true);
    finish({ ok: false, reason: "cap" });
    expect(await screen.findByRole("alert")).toBeTruthy();
    const again = screen.getByRole("button", { name: "Weitere 5 Karten lernen" });
    expect(again.hasAttribute("disabled")).toBe(false);
  });

  it("zeigt bei der Weiterleitung keine Fehlermeldung, sondern reicht sie weiter", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    learnMoreCards.mockImplementation(async () => redirect("/de/study"));
    await clickButton();
    expect(await screen.findByText("Abgefangen")).toBeTruthy();
    expect(screen.queryByText("Keine Verbindung. Versuche es erneut.")).toBeNull();
  });
});
