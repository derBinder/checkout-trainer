// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";

type Status = "pending" | "active" | "blocked";
const session = vi.hoisted(() => ({ user: null as null | { status: Status } }));
function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}
vi.mock("@/lib/auth/guard", () => ({ getSessionUser: async () => session.user }));
vi.mock("@/components/auth/sign-out-button", () => ({
  SignOutButton: () => <button type="button">Abmelden</button>,
}));

const { default: WaitingPage, instant, generateMetadata } = await import("./page");

async function redirectTarget() {
  const error = await WaitingPage().then(
    () => null,
    (e: unknown) => e as { digest?: string },
  );
  return error?.digest?.split(";")[2];
}

beforeEach(() => {
  session.user = null;
});

describe("Warten auf Freischaltung", () => {
  it("schickt Besucher ohne Sitzung zur Anmeldung", async () => {
    expect(await redirectTarget()).toBe("/de/sign-in");
  });

  it("schickt freigeschaltete Konten zur Übersicht", async () => {
    session.user = { status: "active" };
    expect(await redirectTarget()).toBe("/de/today");
  });

  it("sagt einem wartenden Konto, dass der Betreiber es freischalten muss", async () => {
    session.user = { status: "pending" };
    render(await WaitingPage(), { wrapper });
    expect(
      screen.getByRole("heading", { name: "Dein Konto wartet auf Freischaltung durch den Betreiber." }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abmelden" })).toBeTruthy();
  });

  it("sagt einem gesperrten Konto, dass es gesperrt ist", async () => {
    session.user = { status: "blocked" };
    render(await WaitingPage(), { wrapper });
    expect(screen.getByRole("heading", { name: "Dein Konto ist gesperrt." })).toBeTruthy();
  });

  it("bleibt beim Seitenwechsel blockierend", async () => {
    expect(instant).toBe(false);
    expect((await generateMetadata()).title).toBe("Freischaltung · Checkout-Trainer");
  });
});
