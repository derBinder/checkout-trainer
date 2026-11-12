// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sprache aus dem ersten URL-Segment; ohne Angabe Deutsch.
const rootParams = vi.hoisted(() => ({ lang: "de" }));
vi.mock("next/root-params", () => ({ lang: async () => rootParams.lang }));

// Formulare und Dienste haben eigene Tests oder laufen nur in Next bzw. bei Vercel.
vi.mock("@/components/auth/login-form", () => ({ LoginForm: () => <form aria-label="Anmeldung" /> }));
vi.mock("@/components/auth/register-form", () => ({
  RegisterForm: () => <form aria-label="Registrierung" />,
}));
// next/font funktioniert nur mit dem Next-Compiler.
vi.mock("next/font/google", () => ({ Archivo: () => ({ variable: "font-archivo" }) }));
vi.mock("@vercel/analytics/next", () => ({ Analytics: () => <i data-testid="analytics" /> }));
vi.mock("@vercel/speed-insights/next", () => ({ SpeedInsights: () => <i data-testid="speed" /> }));
vi.mock("@/components/theme/theme-sync", () => ({ ThemeSync: () => null }));
// Das Stylesheet braucht die PostCSS-Kette von Tailwind, die Vitest nicht lädt.
vi.mock("../globals.css", () => ({}));

const { default: Home } = await import("./page");
const { default: LoginPage, generateMetadata: loginMetadata } = await import("./sign-in/page");
const { default: RegisterPage, generateMetadata: registerMetadata } = await import("./sign-up/page");
const { default: Imprint, metadata: imprintMetadata } = await import("./imprint/page");
const { default: Privacy, metadata: privacyMetadata } = await import("./privacy/page");
const { default: RootLayout, generateStaticParams, metadata, viewport } = await import("./layout");
const { themeInitScript } = await import("@/lib/theme");

const href = (name: string) => screen.getByRole("link", { name }).getAttribute("href");

beforeEach(() => {
  rootParams.lang = "de";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Startseite", () => {
  it("stellt die App vor und führt zu Registrierung, Anmeldung und den Pflichtseiten", async () => {
    render(await Home());
    expect(screen.getByRole("heading", { level: 1, name: "Checkout-Trainer" })).toBeTruthy();
    expect(screen.getByText(/Checkout-Wege von 170 abwärts/)).toBeTruthy();
    expect(href("Registrieren")).toBe("/de/sign-up");
    expect(href("Anmelden")).toBe("/de/sign-in");
    expect(href("Impressum")).toBe("/de/imprint");
    expect(href("Datenschutz")).toBe("/de/privacy");
  });

  it("verlinkt in der Sprache der Seite", async () => {
    rootParams.lang = "en";
    render(await Home());
    expect(href("Registrieren")).toBe("/en/sign-up");
    expect(href("Datenschutz")).toBe("/en/privacy");
  });
});

describe("Anmelden", () => {
  it("zeigt das Formular, den Hinweis zum Passwort und den Weg zur Registrierung", async () => {
    render(await LoginPage());
    expect(screen.getByRole("heading", { level: 1, name: "Anmelden" })).toBeTruthy();
    expect(screen.getByRole("form", { name: "Anmeldung" })).toBeTruthy();
    expect(screen.getByText(/Wende dich an den Betreiber/)).toBeTruthy();
    expect(href("Registrieren")).toBe("/de/sign-up");
    expect((await loginMetadata()).title).toBe("Anmelden · Checkout-Trainer");
  });
});

describe("Registrieren", () => {
  it("zeigt das Formular und den Weg zur Anmeldung", async () => {
    render(await RegisterPage());
    expect(screen.getByRole("heading", { level: 1, name: "Registrieren" })).toBeTruthy();
    expect(screen.getByRole("form", { name: "Registrierung" })).toBeTruthy();
    expect(href("Anmelden")).toBe("/de/sign-in");
    expect((await registerMetadata()).title).toBe("Registrieren · Checkout-Trainer");
  });
});

describe("Anmelden und Registrieren auf Englisch", () => {
  it("zeigt Überschriften, Links und Titel auf Englisch", async () => {
    rootParams.lang = "en";
    render(await LoginPage());
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeTruthy();
    expect(screen.getByText(/Ask the operator/)).toBeTruthy();
    expect(href("Sign up")).toBe("/en/sign-up");
    expect((await loginMetadata()).title).toBe("Sign in · Checkout-Trainer");
    cleanup();

    render(await RegisterPage());
    expect(screen.getByRole("heading", { level: 1, name: "Sign up" })).toBeTruthy();
    expect(href("Sign in")).toBe("/en/sign-in");
    expect((await registerMetadata()).title).toBe("Sign up · Checkout-Trainer");
  });
});

describe.each([
  ["Impressum", Imprint, imprintMetadata],
  ["Datenschutz", Privacy, privacyMetadata],
])("%s", (title, Page, pageMetadata) => {
  it("zeigt Überschrift, Platzhaltertext und den Weg zur Startseite", async () => {
    render(await Page());
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeTruthy();
    expect(screen.getByText("Dieser Text wird vom Betreiber ergänzt.")).toBeTruthy();
    expect(href("Zur Startseite")).toBe("/de");
    expect(pageMetadata.title).toBe(`${title} · Checkout-Trainer`);
  });
});

describe("Root-Layout", () => {
  it("setzt Sprache, Schrift und das Darstellungs-Skript vor dem Inhalt", async () => {
    const html = renderToStaticMarkup(await RootLayout({ children: <main>Inhalt</main> }));
    expect(html).toMatch(/^<html lang="de" class="font-archivo">/);
    expect(html).toContain(`<script>${themeInitScript}</script>`);
    expect(html.indexOf("<script>")).toBeLessThan(html.indexOf("<main>Inhalt</main>"));
    expect(html).toContain('data-testid="analytics"');
    expect(html).toContain('data-testid="speed"');
    expect(metadata.title).toBe("Checkout-Trainer");
    expect(viewport.viewportFit).toBe("cover");
  });

  it("nimmt die Sprache aus der URL und rendert beide Sprachen vor", async () => {
    rootParams.lang = "en";
    const html = renderToStaticMarkup(await RootLayout({ children: <main>Inhalt</main> }));
    expect(html).toMatch(/^<html lang="en"/);
    expect(generateStaticParams()).toEqual([{ lang: "de" }, { lang: "en" }]);
  });
});
