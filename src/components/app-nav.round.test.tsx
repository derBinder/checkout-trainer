// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";

const pathname = vi.hoisted(() => ({ value: "/de/practice" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

const { AppNav } = await import("./app-nav");
const { useMarkRoundActive } = await import("./practice/practice-round-store");
const { PracticeTitle } = await import("./practice/practice-title");

function Round({ active }: { active: boolean }) {
  useMarkRoundActive(active);
  return null;
}

function renderNav(path: string, round: React.ReactNode) {
  pathname.value = path;
  return render(
    <I18nProvider locale="de">
      <AppNav adminItem={null} />
      {round}
    </I18nProvider>,
  );
}

const nav = () => screen.queryByRole("navigation", { name: "Hauptnavigation" });

describe("AppNav während einer Übungsrunde", () => {
  it("ist auf der Auswahlseite sichtbar und markiert „Heute“", () => {
    renderNav("/de/practice", <Round active={false} />);
    expect(nav()).toBeTruthy();
    expect(screen.getByRole("link", { name: "Heute" }).getAttribute("aria-current")).toBe("page");
  });

  it("fehlt, solange eine Runde läuft, und kommt danach wieder", () => {
    const { rerender } = renderNav("/de/practice", <Round active />);
    expect(nav()).toBeNull();
    rerender(
      <I18nProvider locale="de">
        <AppNav adminItem={null} />
      </I18nProvider>,
    );
    expect(nav()).toBeTruthy();
  });

  it("bleibt auf anderen Seiten sichtbar", () => {
    renderNav("/de/today", <Round active />);
    expect(nav()).toBeTruthy();
  });
});

describe("PracticeTitle", () => {
  it("steht auf der Auswahlseite und verschwindet während einer Runde", () => {
    const { rerender } = render(
      <>
        <PracticeTitle>Üben</PracticeTitle>
        <Round active={false} />
      </>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Üben" })).toBeTruthy();
    rerender(
      <>
        <PracticeTitle>Üben</PracticeTitle>
        <Round active />
      </>,
    );
    expect(screen.queryByRole("heading", { level: 1, name: "Üben" })).toBeNull();
  });
});
