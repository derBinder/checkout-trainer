// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";

const user = vi.hoisted(() => ({
  id: "u1",
  email: "spieler@beispiel.de",
  name: "Spieler",
  status: "active" as const,
  role: "user",
  newPerDay: 5,
}));
vi.mock("@/lib/auth/guard", () => ({ requireActiveUser: async () => user }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ bfcacheId: "seite" }) }));
const host = vi.hoisted(() => vi.fn((_props: unknown) => <p>Übungsseite</p>));
vi.mock("./practice-host", () => ({ PracticeHost: host }));

const { PracticeData } = await import("./practice-data");

describe("PracticeData", () => {
  it("gibt nach der Zugriffsprüfung alle Karten mit Gruppen und die Auflösungen der Reste 2 bis 170 weiter", async () => {
    render(<I18nProvider locale="de">{await PracticeData()}</I18nProvider>);
    expect(screen.getByText("Übungsseite")).toBeTruthy();
    const props = host.mock.calls[0][0] as {
      cards: { id: string; rest: number; groups: string[]; view: { question: { label: string } } }[];
      solutions: Record<number, unknown>;
    };
    expect(props.cards).toHaveLength(402);
    expect(props.cards.find((c) => c.id === "t-125")).toMatchObject({ rest: 125, groups: ["setups"] });
    expect(props.cards[0].view.question.label).toBe("Rest");
    expect(Object.keys(props.solutions)).toHaveLength(169);
  });
});
