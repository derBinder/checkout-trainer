// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";

const user = vi.hoisted(() => ({
  id: "u1",
  email: "spieler@beispiel.de",
  name: "Spieler",
  status: "active" as const,
  role: "user",
  newPerDay: 5,
}));
const calls = vi.hoisted(() => [] as string[]);
const extras = vi.hoisted(() => ({ value: { singleDouble: false, neighbours: false, over170: false } }));
vi.mock("@/lib/auth/guard", () => ({
  requireActiveUser: async () => {
    calls.push("auth");
    return user;
  },
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/extra-cards-db", () => ({
  loadExtraCards: async (_db: unknown, userId: string) => {
    calls.push(`extras ${userId}`);
    return extras.value;
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ bfcacheId: "seite" }) }));
const host = vi.hoisted(() => vi.fn<(props: unknown) => React.JSX.Element>(() => <p>Übungsseite</p>));
vi.mock("./practice-host", () => ({ PracticeHost: host }));

const { PracticeData } = await import("./practice-data");

type HostProps = {
  cards: { id: string; rest: number; groups: string[]; view: { question: { label: string } } }[];
  solutions: Record<number, unknown>;
  ranges: string[];
};

beforeEach(() => {
  calls.length = 0;
  host.mockClear();
  extras.value = { singleDouble: false, neighbours: false, over170: false };
});

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
    expect(calls).toEqual(["auth", "extras u1"]);
  });

  it("bietet ohne Zusatzkarten weder deren Karten noch den Bereich 171–230 an", async () => {
    render(<I18nProvider locale="de">{await PracticeData()}</I18nProvider>);
    const props = host.mock.calls[0][0] as HostProps;
    expect(props.cards.some((c) => /^[ndo]-/.test(c.id))).toBe(false);
    expect(props.ranges).not.toContain("171-230");
  });

  it("bietet eingeschaltete Zusatzkarten und mit „Reste über 170“ den Bereich 171–230 an", async () => {
    extras.value = { singleDouble: false, neighbours: true, over170: true };
    render(<I18nProvider locale="de">{await PracticeData()}</I18nProvider>);
    const props = host.mock.calls[0][0] as HostProps;
    expect(props.cards).toHaveLength(402 + 202 + 60);
    expect(props.cards.find((c) => c.id === "o-199")).toMatchObject({ rest: 199, groups: ["setups"] });
    expect(props.cards.some((c) => c.id.startsWith("d-"))).toBe(false);
    expect(props.ranges).toContain("171-230");
    expect(Object.keys(props.solutions)).toHaveLength(169);
  });
});
