// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateNewPerDay = vi.hoisted(() => vi.fn());
vi.mock("@/app/(app)/einstellungen/actions", () => ({ updateNewPerDay }));

const { NewPerDayForm, NewPerDayInput } = await import("./new-per-day-form");

function renderForm(initial = 10) {
  return render(
    <NewPerDayForm>
      <NewPerDayInput initial={initial} />
    </NewPerDayForm>,
  );
}

function field() {
  return screen.getByLabelText("Neue Karten pro Tag") as HTMLInputElement;
}

function saveButton() {
  return screen.getByRole("button", { name: "Speichern" });
}

async function changeAndSave(value: string) {
  const user = userEvent.setup();
  renderForm();
  await user.clear(field());
  if (value) await user.type(field(), value);
  await user.click(saveButton());
  return user;
}

beforeEach(() => {
  updateNewPerDay.mockReset();
});

describe("NewPerDayForm", () => {
  it("zeigt den gespeicherten Wert und den Hinweis zum erlaubten Bereich", () => {
    renderForm(12);
    expect(field().value).toBe("12");
    expect(screen.getByText(/Von 0 bis 50\./)).toBeTruthy();
    expect(field().getAttribute("aria-describedby")).toBe("newPerDay-hint");
  });

  it("speichert die neue Zahl und bestätigt", async () => {
    updateNewPerDay.mockResolvedValue({ ok: true });
    await changeAndSave("25");
    expect(updateNewPerDay).toHaveBeenCalledWith(25);
    expect((await screen.findByRole("status")).textContent).toBe("Gespeichert.");
  });

  it("speichert nichts außerhalb des Bereichs und setzt den Fokus ins Feld", async () => {
    await changeAndSave("51");
    expect(updateNewPerDay).not.toHaveBeenCalled();
    expect(screen.getByText("Gib eine ganze Zahl von 0 bis 50 ein.")).toBeTruthy();
    expect(field().getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(field());
    const ids = field().getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(ids[0]).toBe("newPerDay-hint");
    expect(document.getElementById(ids[1])?.textContent).toBe(
      "Gib eine ganze Zahl von 0 bis 50 ein.",
    );
  });

  it("speichert nichts bei leerem Feld", async () => {
    await changeAndSave("");
    expect(updateNewPerDay).not.toHaveBeenCalled();
    expect(screen.getByText("Gib eine ganze Zahl von 0 bis 50 ein.")).toBeTruthy();
  });

  it("meldet, wenn der Server das Speichern ablehnt", async () => {
    updateNewPerDay.mockResolvedValue({ ok: false });
    await changeAndSave("5");
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Das hat nicht geklappt. Versuche es erneut.",
    );
  });

  it("meldet eine fehlende Verbindung", async () => {
    updateNewPerDay.mockRejectedValue(new Error("offline"));
    await changeAndSave("5");
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Keine Verbindung. Versuche es erneut.",
    );
  });

  it("sperrt den Knopf, solange gespeichert wird", async () => {
    let finish: (value: { ok: true }) => void = () => {};
    updateNewPerDay.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await changeAndSave("5");
    expect(saveButton().hasAttribute("disabled")).toBe(true);
    await act(async () => finish({ ok: true }));
    expect(saveButton().hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("status").textContent).toBe("Gespeichert.");
  });

  it("entfernt die alte Rückmeldung beim nächsten Speichern", async () => {
    updateNewPerDay.mockResolvedValueOnce({ ok: false });
    const user = await changeAndSave("5");
    await screen.findByRole("alert");
    await user.clear(field());
    await user.type(field(), "99");
    await user.click(saveButton());
    expect(screen.queryByText("Das hat nicht geklappt. Versuche es erneut.")).toBeNull();
    expect(screen.getByText("Gib eine ganze Zahl von 0 bis 50 ein.")).toBeTruthy();
  });

  it("speichert nichts, solange das Feld noch lädt", async () => {
    const user = userEvent.setup();
    render(
      <NewPerDayForm>
        <span>lädt</span>
      </NewPerDayForm>,
    );
    await user.click(saveButton());
    expect(updateNewPerDay).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("vergisst die Rückmeldung beim Verbergen der Seite, behält aber die Eingabe", async () => {
    updateNewPerDay.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    const tree = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <NewPerDayForm>
          <NewPerDayInput initial={10} />
        </NewPerDayForm>
      </Activity>
    );
    const { rerender } = render(tree("visible"));
    await user.clear(field());
    await user.type(field(), "20");
    await user.click(saveButton());
    await screen.findByRole("status");
    await user.clear(field());
    await user.type(field(), "30");

    rerender(tree("hidden"));
    rerender(tree("visible"));

    expect(screen.queryByRole("status")).toBeNull();
    expect(field().value).toBe("30");
  });
});
