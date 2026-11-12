// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const signIn = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/client", () => ({ authClient: { signIn: { email: signIn } } }));

const { LoginForm } = await import("./login-form");

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  render(<LoginForm />);
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
    expect(router.replace).toHaveBeenCalledWith("/heute");
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
    render(<LoginForm />);
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
});
