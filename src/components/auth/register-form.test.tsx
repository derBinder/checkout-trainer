// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const signUp = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/client", () => ({ authClient: { signUp: { email: signUp } } }));

const { RegisterForm } = await import("./register-form");

const STRONG = "korrekt-pferd-batterie";

async function fillAndSubmit(name: string, email: string, password: string) {
  const user = userEvent.setup();
  render(<RegisterForm />);
  if (name) await user.type(screen.getByLabelText("Name"), name);
  if (email) await user.type(screen.getByLabelText("E-Mail"), email);
  if (password) await user.type(screen.getByLabelText("Passwort"), password);
  await user.click(screen.getByRole("button", { name: "Registrieren" }));
  return user;
}

beforeEach(() => {
  router.replace.mockReset();
  signUp.mockReset();
});

describe("RegisterForm", () => {
  it("registriert mit bereinigten Angaben und geht zur Warteseite", async () => {
    signUp.mockResolvedValue({ error: null });
    await fillAndSubmit("  Felix  ", " name@beispiel.de ", STRONG);
    expect(signUp).toHaveBeenCalledWith({
      name: "Felix",
      email: "name@beispiel.de",
      password: STRONG,
    });
    expect(router.replace).toHaveBeenCalledWith("/warten");
  });

  it("schickt nichts ab, zeigt alle Hinweise und setzt den Fokus aufs erste Feld", async () => {
    await fillAndSubmit("", "", "");
    expect(signUp).not.toHaveBeenCalled();
    expect(screen.getByText("Bitte gib einen Namen ein.")).toBeTruthy();
    expect(screen.getByText("Bitte gib deine E-Mail-Adresse ein.")).toBeTruthy();
    expect(screen.getByText("Bitte gib ein Passwort ein.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("Name"));
  });

  it("setzt den Fokus auf das erste fehlerhafte Feld, nicht auf das erste Feld", async () => {
    await fillAndSubmit("Felix", "name@beispiel.de", "kurz");
    expect(signUp).not.toHaveBeenCalled();
    expect(screen.getByText("Das Passwort braucht mindestens 10 Zeichen.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("Passwort"));
  });

  it("verknüpft den Stärkehinweis und bei einem Fehler zusätzlich die Meldung", async () => {
    await fillAndSubmit("Felix", "name@beispiel.de", "kurz");
    const password = screen.getByLabelText("Passwort");
    const ids = password.getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(ids[0]).toBe("password-hint");
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[1])?.textContent).toBe(
      "Das Passwort braucht mindestens 10 Zeichen.",
    );
  });

  it("zeigt die Passwortstärke beim Tippen", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    expect(screen.getByText("Mindestens 10 Zeichen.")).toBeTruthy();
    await user.type(screen.getByLabelText("Passwort"), STRONG);
    expect(screen.queryByText("Mindestens 10 Zeichen.")).toBeNull();
    expect(screen.getByText(/Stärke:/)).toBeTruthy();
  });

  it("zeigt den Fehler der Registrierung auf Deutsch und gibt den Knopf wieder frei", async () => {
    signUp.mockResolvedValue({ error: { status: 422, code: "USER_ALREADY_EXISTS" } });
    await fillAndSubmit("Felix", "name@beispiel.de", STRONG);
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Unter dieser E-Mail-Adresse gibt es schon ein Konto.",
    );
    expect(router.replace).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Registrieren" }).hasAttribute("disabled"),
    ).toBe(false);
  });

  it("meldet eine fehlende Verbindung", async () => {
    signUp.mockRejectedValue(new Error("offline"));
    await fillAndSubmit("Felix", "name@beispiel.de", STRONG);
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Keine Verbindung. Versuche es erneut.",
    );
    expect(
      screen.getByRole("button", { name: "Registrieren" }).hasAttribute("disabled"),
    ).toBe(false);
  });

  it("sperrt den Knopf, solange die Registrierung läuft", async () => {
    let finish: (value: { error: null }) => void = () => {};
    signUp.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await fillAndSubmit("Felix", "name@beispiel.de", STRONG);
    expect(
      screen.getByRole("button", { name: "Registrieren" }).hasAttribute("disabled"),
    ).toBe(true);
    finish({ error: null });
    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/warten"));
  });

  it("prüft das Passwort erst beim Verlassen und danach bei jeder Eingabe", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    const password = screen.getByLabelText("Passwort");
    await user.type(password, "kurz");
    expect(password.getAttribute("aria-invalid")).toBe("false");
    await user.click(screen.getByLabelText("Name"));
    expect(password.getAttribute("aria-invalid")).toBe("true");
    await user.type(password, "-und-jetzt-lang");
    expect(password.getAttribute("aria-invalid")).toBe("false");
  });

  it("wertet den Wechsel aufs eigene Auge nicht als Verlassen", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.click(screen.getByLabelText("Passwort"));
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Passwort anzeigen" }),
    );
    expect(screen.getByLabelText("Passwort").getAttribute("aria-invalid")).toBe("false");
  });
});
