// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { redirect } from "next/navigation";
import { Activity, Component, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  changeUserStatus: vi.fn(),
  changeUserPassword: vi.fn(),
}));
vi.mock("@/app/(app)/verwaltung/actions", () => actions);

const { UserActions } = await import("./user-actions");

const FAILED = "Das hat nicht geklappt. Lade die Seite neu und versuche es erneut.";
const GOOD_PASSWORD = "lang-genug-123";

class Boundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    return this.state.error ? <p>Abgefangen</p> : this.props.children;
  }
}

function setup(status = "active") {
  const user = userEvent.setup();
  const view = render(
    <Boundary>
      <UserActions userId="u1" name="Erika" status={status} />
    </Boundary>,
  );
  return { user, ...view };
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Passwort setzen" }));
  return screen.findByRole("alertdialog");
}

function submitButton() {
  return screen
    .getAllByRole("button", { name: "Passwort setzen" })
    .find((button) => button.getAttribute("type") === "submit")!;
}

beforeEach(() => {
  actions.changeUserStatus.mockReset();
  actions.changeUserPassword.mockReset();
});

describe("UserActions: Status", () => {
  it("bietet bei einem aktiven Konto nur Sperren an", () => {
    setup("active");
    expect(screen.getByRole("button", { name: "Sperren" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Entsperren" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Freischalten" })).toBeNull();
  });

  it("bietet bei einem gesperrten Konto nur Entsperren an", () => {
    setup("blocked");
    expect(screen.getByRole("button", { name: "Entsperren" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sperren" })).toBeNull();
  });

  it("bietet bei einer wartenden Registrierung Freischalten und Sperren an", () => {
    setup("pending");
    expect(screen.getByRole("button", { name: "Freischalten" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sperren" })).toBeTruthy();
  });

  it("schaltet frei, ohne eine Meldung zu zeigen", async () => {
    actions.changeUserStatus.mockResolvedValue({ ok: true });
    const { user } = setup("pending");
    await user.click(screen.getByRole("button", { name: "Freischalten" }));
    expect(actions.changeUserStatus).toHaveBeenCalledWith("u1", "active");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sperren" }).hasAttribute("disabled")).toBe(false),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("sperrt die Knöpfe, solange die Änderung läuft", async () => {
    let finish: (value: unknown) => void = () => {};
    actions.changeUserStatus.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { user } = setup("active");
    await user.click(screen.getByRole("button", { name: "Sperren" }));
    expect(actions.changeUserStatus).toHaveBeenCalledWith("u1", "blocked");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sperren" }).hasAttribute("disabled")).toBe(true),
    );
    // Die Rückfrage öffnet sich währenddessen nicht.
    await user.click(screen.getByRole("button", { name: "Passwort setzen" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    finish({ ok: true });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sperren" }).hasAttribute("disabled")).toBe(false),
    );
  });

  it("meldet, wenn die Änderung scheitert", async () => {
    actions.changeUserStatus.mockResolvedValue({ ok: false });
    const { user } = setup("blocked");
    await user.click(screen.getByRole("button", { name: "Entsperren" }));
    expect((await screen.findByRole("alert")).textContent).toBe(FAILED);
  });

  it("meldet eine fehlende Verbindung", async () => {
    actions.changeUserStatus.mockRejectedValue(new Error("offline"));
    const { user } = setup("active");
    await user.click(screen.getByRole("button", { name: "Sperren" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Keine Verbindung. Versuche es erneut.",
    );
  });

  it("reicht eine Weiterleitung weiter statt einen Fehler zu zeigen", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    actions.changeUserStatus.mockImplementation(async () => redirect("/anmelden"));
    const { user } = setup("active");
    await user.click(screen.getByRole("button", { name: "Sperren" }));
    expect(await screen.findByText("Abgefangen")).toBeTruthy();
    log.mockRestore();
  });
});

describe("UserActions: Passwort setzen", () => {
  it("öffnet die Rückfrage mit dem Namen des Nutzers", async () => {
    const { user } = setup();
    const dialog = await openDialog(user);
    expect(dialog.textContent).toContain("Passwort für Erika setzen");
    expect(screen.getByLabelText("Neues Passwort")).toBeTruthy();
  });

  it("schickt ohne Passwort nichts ab und zeigt einen Hinweis", async () => {
    const { user } = setup();
    await openDialog(user);
    await user.click(submitButton());
    expect(actions.changeUserPassword).not.toHaveBeenCalled();
    expect(screen.getByText("Bitte gib ein Passwort ein.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("Neues Passwort"));
  });

  it("weist ein zu kurzes Passwort ab", async () => {
    const { user } = setup();
    await openDialog(user);
    await user.type(screen.getByLabelText("Neues Passwort"), "kurz");
    await user.click(submitButton());
    expect(actions.changeUserPassword).not.toHaveBeenCalled();
    expect(screen.getByText(/mindestens 10 Zeichen/)).toBeTruthy();
  });

  it("setzt das Passwort, schließt die Rückfrage und bestätigt", async () => {
    actions.changeUserPassword.mockResolvedValue({ ok: true });
    const { user } = setup();
    await openDialog(user);
    await user.type(screen.getByLabelText("Neues Passwort"), GOOD_PASSWORD);
    await user.click(submitButton());
    expect(actions.changeUserPassword).toHaveBeenCalledWith("u1", GOOD_PASSWORD);
    expect((await screen.findByRole("status")).textContent).toBe(
      "Passwort gesetzt. Alle Sitzungen des Nutzers sind beendet.",
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("bleibt offen und meldet, wenn das Setzen scheitert", async () => {
    actions.changeUserPassword.mockResolvedValue({ ok: false });
    const { user } = setup();
    const dialog = await openDialog(user);
    await user.type(screen.getByLabelText("Neues Passwort"), GOOD_PASSWORD);
    await user.click(submitButton());
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Das Passwort wurde nicht gesetzt.",
    );
    expect(dialog.isConnected).toBe(true);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("meldet eine fehlende Verbindung in der Rückfrage", async () => {
    actions.changeUserPassword.mockRejectedValue(new Error("offline"));
    const { user } = setup();
    await openDialog(user);
    await user.type(screen.getByLabelText("Neues Passwort"), GOOD_PASSWORD);
    await user.click(submitButton());
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Keine Verbindung. Das Passwort wurde nicht gesetzt.",
    );
  });

  it("reicht eine Weiterleitung beim Passwort weiter", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    actions.changeUserPassword.mockImplementation(async () => redirect("/anmelden"));
    const { user } = setup();
    await openDialog(user);
    await user.type(screen.getByLabelText("Neues Passwort"), GOOD_PASSWORD);
    await user.click(submitButton());
    expect(await screen.findByText("Abgefangen")).toBeTruthy();
    log.mockRestore();
  });

  it("lässt sich nicht schließen, solange das Passwort gesetzt wird", async () => {
    let finish: (value: unknown) => void = () => {};
    actions.changeUserPassword.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { user } = setup();
    const dialog = await openDialog(user);
    await user.type(screen.getByLabelText("Neues Passwort"), GOOD_PASSWORD);
    await user.click(submitButton());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Abbrechen" }).hasAttribute("disabled")).toBe(true),
    );
    await user.keyboard("{Escape}");
    expect(dialog.isConnected).toBe(true);
    finish({ ok: true });
    expect(await screen.findByRole("status")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("vergisst Eingabe und Fehler beim Abbrechen", async () => {
    actions.changeUserPassword.mockResolvedValue({ ok: false });
    const { user } = setup();
    await openDialog(user);
    await user.type(screen.getByLabelText("Neues Passwort"), GOOD_PASSWORD);
    await user.click(submitButton());
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    await openDialog(user);
    expect((screen.getByLabelText("Neues Passwort") as HTMLInputElement).value).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("kommt nach dem Verbergen der Seite geschlossen und ohne Eingabe zurück", async () => {
    actions.changeUserStatus.mockResolvedValue({ ok: false });
    const user = userEvent.setup();
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <UserActions userId="u1" name="Erika" status="active" />
      </Activity>
    );
    const { rerender } = render(page("visible"));
    await user.click(screen.getByRole("button", { name: "Sperren" }));
    await screen.findByRole("alert");
    await openDialog(user);
    await user.type(screen.getByLabelText("Neues Passwort"), GOOD_PASSWORD);

    rerender(page("hidden"));
    rerender(page("visible"));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.queryByRole("alert")).toBeNull();
    await openDialog(user);
    expect((screen.getByLabelText("Neues Passwort") as HTMLInputElement).value).toBe("");
  });
});
