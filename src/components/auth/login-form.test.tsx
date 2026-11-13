// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";

// Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts.
function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const signIn = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/client", () => ({ authClient: { signIn: { email: signIn } } }));

const { LoginForm } = await import("./login-form");

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  render(<LoginForm />, { wrapper });
  if (email) await user.type(screen.getByLabelText("E-Mail"), email);
  if (password) await user.type(screen.getByLabelText("Passwort"), password);
  await user.click(screen.getByRole("button", { name: "Anmelden" }));
  return user;
}

beforeEach(() => {
  router.replace.mockReset();
  signIn.mockReset();
});

describe("LoginForm", () => {
  it("meldet an und geht zur Übersicht", async () => {
    signIn.mockResolvedValue({ error: null });
    await fillAndSubmit("  name@beispiel.de ", "geheim");
    expect(signIn).toHaveBeenCalledWith({ email: "name@beispiel.de", password: "geheim" });
    expect(router.replace).toHaveBeenCalledWith("/de/today");
  });

  it("schickt nichts ab und zeigt Hinweise, solange Felder fehlen", async () => {
    await fillAndSubmit("", "");
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByText("Bitte gib deine E-Mail-Adresse ein.")).toBeTruthy();
    expect(screen.getByText("Bitte gib ein Passwort ein.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("E-Mail"));
  });

  it("zeigt den Fehler der Anmeldung auf Deutsch", async () => {
    signIn.mockResolvedValue({
      error: { status: 401, code: "INVALID_EMAIL_OR_PASSWORD" },
    });
    await fillAndSubmit("name@beispiel.de", "falsch");
    expect((await screen.findByRole("alert")).textContent).toBe(
      "E-Mail-Adresse oder Passwort stimmt nicht.",
    );
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Anmelden" }).hasAttribute("disabled")).toBe(false);
  });

  it("meldet eine fehlende Verbindung", async () => {
    signIn.mockRejectedValue(new Error("offline"));
    await fillAndSubmit("name@beispiel.de", "geheim");
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Keine Verbindung. Versuche es erneut.",
    );
  });

  it("prüft ein Feld erst beim Verlassen", async () => {
    const user = userEvent.setup();
    render(<LoginForm />, { wrapper });
    const email = screen.getByLabelText("E-Mail");
    await user.type(email, "kaputt");
    expect(email.getAttribute("aria-invalid")).toBe("false");
    await user.tab();
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(/keine gültige E-Mail-Adresse/)).toBeTruthy();
    await user.clear(email);
    await user.type(email, "name@beispiel.de");
    expect(email.getAttribute("aria-invalid")).toBe("false");
  });

  it("leert beim Verbergen der Seite Felder, Sichtbarkeit, Hinweise und Sperre", async () => {
    // Nach erfolgreicher Anmeldung bleibt die Seite versteckt im DOM (Activity).
    signIn.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    const { rerender } = render(
      <Activity mode="visible">
        <LoginForm />
      </Activity>,
      { wrapper },
    );
    await user.type(screen.getByLabelText("E-Mail"), "name@beispiel.de");
    await user.type(screen.getByLabelText("Passwort"), "geheim-geheim");
    await user.click(screen.getByRole("button", { name: "Passwort anzeigen" }));
    expect((screen.getByLabelText("Passwort") as HTMLInputElement).type).toBe("text");
    await user.click(screen.getByRole("button", { name: "Anmelden" }));
    expect(router.replace).toHaveBeenCalledWith("/de/today");

    rerender(
      <Activity mode="hidden">
        <LoginForm />
      </Activity>,
    );
    const hidden = document.querySelector<HTMLInputElement>('input[name="password"]');
    expect(hidden?.value).toBe("");

    rerender(
      <Activity mode="visible">
        <LoginForm />
      </Activity>,
    );
    const password = screen.getByLabelText("Passwort") as HTMLInputElement;
    expect(password.value).toBe("");
    expect(password.type).toBe("password");
    expect((screen.getByLabelText("E-Mail") as HTMLInputElement).value).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Anmelden" }).hasAttribute("disabled")).toBe(false);
  });

  it("entfernt beim Verbergen Fehlermeldung und Feldhinweise", async () => {
    signIn.mockResolvedValue({ error: { status: 401, code: "INVALID_EMAIL_OR_PASSWORD" } });
    const user = userEvent.setup();
    const { rerender } = render(
      <Activity mode="visible">
        <LoginForm />
      </Activity>,
      { wrapper },
    );
    await user.type(screen.getByLabelText("E-Mail"), "name@beispiel.de");
    await user.type(screen.getByLabelText("Passwort"), "falsch");
    await user.click(screen.getByRole("button", { name: "Anmelden" }));
    await screen.findByRole("alert");
    await user.clear(screen.getByLabelText("Passwort"));
    expect(screen.getByText("Bitte gib ein Passwort ein.")).toBeTruthy();

    rerender(
      <Activity mode="hidden">
        <LoginForm />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <LoginForm />
      </Activity>,
    );
    expect(screen.queryAllByRole("alert")).toHaveLength(0);
    expect(screen.queryByText("Bitte gib ein Passwort ein.")).toBeNull();
    expect(screen.getByLabelText("Passwort").getAttribute("aria-invalid")).toBe("false");
  });
});

describe("LoginForm auf Englisch", () => {
  it("zeigt Beschriftungen, Prüfmeldungen und Anmeldefehler auf Englisch", async () => {
    const user = userEvent.setup();
    render(<LoginForm />, {
      wrapper: ({ children }) => <I18nProvider locale="en">{children}</I18nProvider>,
    });
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByText("Please enter your email address.")).toBeTruthy();
    expect(screen.getByText("Please enter a password.")).toBeTruthy();

    signIn.mockResolvedValue({ error: { status: 429 } });
    await user.type(screen.getByLabelText("Email"), "name@example.com");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Too many attempts. Wait a few minutes and try again.",
    );
  });
});
