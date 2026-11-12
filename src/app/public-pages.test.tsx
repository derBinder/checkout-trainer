// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

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
vi.mock("./globals.css", () => ({}));

const { default: Home } = await import("./page");
const { default: LoginPage, metadata: loginMetadata } = await import("./anmelden/page");
const { default: RegisterPage, metadata: registerMetadata } = await import("./registrieren/page");
const { default: Imprint, metadata: imprintMetadata } = await import("./impressum/page");
const { default: Privacy, metadata: privacyMetadata } = await import("./datenschutz/page");
const { default: RootLayout, metadata, viewport } = await import("./layout");
const { themeInitScript } = await import("@/lib/theme");

const href = (name: string) => screen.getByRole("link", { name }).getAttribute("href");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Startseite", () => {
  it("stellt die App vor und führt zu Registrierung, Anmeldung und den Pflichtseiten", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "Checkout-Trainer" })).toBeTruthy();
    expect(screen.getByText(/Checkout-Wege von 170 abwärts/)).toBeTruthy();
    expect(href("Registrieren")).toBe("/registrieren");
    expect(href("Anmelden")).toBe("/anmelden");
    expect(href("Impressum")).toBe("/impressum");
    expect(href("Datenschutz")).toBe("/datenschutz");
  });
});

describe("Anmelden", () => {
  it("zeigt das Formular, den Hinweis zum Passwort und den Weg zur Registrierung", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Anmelden" })).toBeTruthy();
    expect(screen.getByRole("form", { name: "Anmeldung" })).toBeTruthy();
    expect(screen.getByText(/Wende dich an den Betreiber/)).toBeTruthy();
    expect(href("Registrieren")).toBe("/registrieren");
    expect(loginMetadata.title).toBe("Anmelden · Checkout-Trainer");
  });
});

describe("Registrieren", () => {
  it("zeigt das Formular und den Weg zur Anmeldung", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Registrieren" })).toBeTruthy();
    expect(screen.getByRole("form", { name: "Registrierung" })).toBeTruthy();
    expect(href("Anmelden")).toBe("/anmelden");
    expect(registerMetadata.title).toBe("Registrieren · Checkout-Trainer");
  });
});

describe.each([
  ["Impressum", Imprint, imprintMetadata],
  ["Datenschutz", Privacy, privacyMetadata],
])("%s", (title, Page, pageMetadata) => {
  it("zeigt Überschrift, Platzhaltertext und den Weg zur Startseite", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeTruthy();
    expect(screen.getByText("Dieser Text wird vom Betreiber ergänzt.")).toBeTruthy();
    expect(href("Zur Startseite")).toBe("/");
    expect(pageMetadata.title).toBe(`${title} · Checkout-Trainer`);
  });
});

describe("Root-Layout", () => {
  it("setzt Sprache, Schrift und das Darstellungs-Skript vor dem Inhalt", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <main>Inhalt</main>
      </RootLayout>,
    );
    expect(html).toMatch(/^<html lang="de" class="font-archivo">/);
    expect(html).toContain(`<script>${themeInitScript}</script>`);
    expect(html.indexOf("<script>")).toBeLessThan(html.indexOf("<main>Inhalt</main>"));
    expect(html).toContain('data-testid="analytics"');
    expect(html).toContain('data-testid="speed"');
    expect(metadata.title).toBe("Checkout-Trainer");
    expect(viewport.viewportFit).toBe("cover");
  });
});
