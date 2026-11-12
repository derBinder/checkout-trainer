// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const deleteUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/client", () => ({ authClient: { deleteUser } }));

const { DeleteAccount } = await import("./delete-account");

function password() {
  return screen.getByLabelText("Passwort zur Bestätigung") as HTMLInputElement;
}

function confirmButton() {
  return screen.getByRole("button", { name: "Endgültig löschen" });
}

function cancelButton() {
  return screen.getByRole("button", { name: "Abbrechen" });
}

async function openDialog() {
  const user = userEvent.setup();
  render(<DeleteAccount />);
  await user.click(screen.getByRole("button", { name: "Konto löschen" }));
  await screen.findByRole("alertdialog");
  return user;
}

async function openAndSubmit(value: string) {
  const user = await openDialog();
  if (value) await user.type(password(), value);
  await user.click(confirmButton());
  return user;
}

beforeEach(() => {
  router.replace.mockReset();
  router.refresh.mockReset();
  deleteUser.mockReset();
});

describe("DeleteAccount", () => {
  it("zeigt die Rückfrage erst nach dem Tippen auf „Konto löschen“", async () => {
    render(<DeleteAccount />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Konto löschen" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain("Konto löschen?");
    expect(dialog.textContent).toContain("endgültig gelöscht");
  });

  it("löscht das Konto mit dem Passwort und geht zur Startseite", async () => {
    deleteUser.mockResolvedValue({ error: null });
    await openAndSubmit("geheim");
    expect(deleteUser).toHaveBeenCalledWith({ password: "geheim" });
    expect(router.replace).toHaveBeenCalledWith("/");
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("löscht nichts ohne Passwort und setzt den Fokus ins Feld", async () => {
    await openAndSubmit("");
    expect(deleteUser).not.toHaveBeenCalled();
    expect(screen.getByText("Bitte gib dein aktuelles Passwort ein.")).toBeTruthy();
    expect(password().getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(password());
  });

  it("zeigt ein falsches Passwort auf Deutsch und lässt die Rückfrage offen", async () => {
    deleteUser.mockResolvedValue({ error: { status: 400, code: "INVALID_PASSWORD" } });
    await openAndSubmit("falsch");
    expect((await screen.findByText("Das Passwort stimmt nicht.")).getAttribute("role")).toBe(
      "alert",
    );
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
    expect(confirmButton().hasAttribute("disabled")).toBe(false);
  });

  it("meldet eine fehlende Verbindung und dass nichts gelöscht wurde", async () => {
    deleteUser.mockRejectedValue(new Error("offline"));
    await openAndSubmit("geheim");
    expect(
      await screen.findByText("Keine Verbindung. Dein Konto wurde nicht gelöscht."),
    ).toBeTruthy();
    expect(confirmButton().hasAttribute("disabled")).toBe(false);
  });

  it("sperrt beide Knöpfe und lässt sich nicht schließen, solange das Löschen läuft", async () => {
    let finish: (value: { error: null }) => void = () => {};
    deleteUser.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = await openAndSubmit("geheim");
    expect(confirmButton().hasAttribute("disabled")).toBe(true);
    expect(cancelButton().hasAttribute("disabled")).toBe(true);
    await user.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    await act(async () => finish({ error: null }));
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("schließt mit „Abbrechen“ und entfernt Fehler und Hinweise", async () => {
    deleteUser.mockResolvedValue({ error: { status: 400, code: "INVALID_PASSWORD" } });
    const user = await openAndSubmit("falsch");
    await screen.findByText("Das Passwort stimmt nicht.");
    await user.clear(password());
    expect(screen.getByText("Bitte gib dein aktuelles Passwort ein.")).toBeTruthy();

    await user.click(cancelButton());
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(deleteUser).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Konto löschen" }));
    await screen.findByRole("alertdialog");
    expect(screen.queryByText("Das Passwort stimmt nicht.")).toBeNull();
    expect(screen.queryByText("Bitte gib dein aktuelles Passwort ein.")).toBeNull();
    expect(password().getAttribute("aria-invalid")).toBe("false");
  });

  it("kommt nach dem Verbergen der Seite geschlossen und mit leerem Feld zurück", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Activity mode="visible">
        <DeleteAccount />
      </Activity>,
    );
    await user.click(screen.getByRole("button", { name: "Konto löschen" }));
    await screen.findByRole("alertdialog");
    await user.type(password(), "geheim");
    await user.click(screen.getByRole("button", { name: "Passwort anzeigen" }));
    expect(password().type).toBe("text");

    rerender(
      <Activity mode="hidden">
        <DeleteAccount />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <DeleteAccount />
      </Activity>,
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    await user.click(screen.getByRole("button", { name: "Konto löschen" }));
    await screen.findByRole("alertdialog");
    expect(password().value).toBe("");
    expect(password().type).toBe("password");
  });
});
