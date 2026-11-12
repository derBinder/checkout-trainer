// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const signOut = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/client", () => ({ authClient: { signOut } }));

const { SignOutButton } = await import("./sign-out-button");

async function clickSignOut() {
  const user = userEvent.setup();
  render(<SignOutButton />);
  await user.click(screen.getByRole("button", { name: "Abmelden" }));
  return user;
}

function buttonDisabled() {
  return screen.getByRole("button", { name: "Abmelden" }).hasAttribute("disabled");
}

beforeEach(() => {
  router.replace.mockReset();
  router.refresh.mockReset();
  signOut.mockReset();
});

describe("SignOutButton", () => {
  it("meldet ab und geht zur Startseite", async () => {
    signOut.mockResolvedValue({ error: null });
    await clickSignOut();
    expect(signOut).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledWith("/");
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("sperrt den Knopf, solange die Abmeldung läuft", async () => {
    let finish: (value: { error: null }) => void = () => {};
    signOut.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await clickSignOut();
    expect(buttonDisabled()).toBe(true);
    finish({ error: null });
    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  });

  it("zeigt den Fehler der Abmeldung auf Deutsch und gibt den Knopf wieder frei", async () => {
    signOut.mockResolvedValue({ error: { status: 429 } });
    await clickSignOut();
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Zu viele Versuche. Warte ein paar Minuten und versuche es dann erneut.",
    );
    expect(router.replace).not.toHaveBeenCalled();
    expect(buttonDisabled()).toBe(false);
  });

  it("meldet eine fehlende Verbindung und dass man noch angemeldet ist", async () => {
    signOut.mockRejectedValue(new Error("offline"));
    await clickSignOut();
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Keine Verbindung. Du bist noch angemeldet.",
    );
    expect(router.replace).not.toHaveBeenCalled();
    expect(buttonDisabled()).toBe(false);
  });

  it("entfernt einen alten Fehler beim nächsten Versuch", async () => {
    signOut.mockRejectedValueOnce(new Error("offline"));
    const user = await clickSignOut();
    await screen.findByRole("alert");
    signOut.mockReturnValueOnce(new Promise(() => {}));
    await user.click(screen.getByRole("button", { name: "Abmelden" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
