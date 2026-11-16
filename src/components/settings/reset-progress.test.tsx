// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";

function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}

const resetLearningProgress = vi.hoisted(() => vi.fn());
vi.mock("@/app/[lang]/(app)/settings/actions", () => ({ resetLearningProgress }));

const { ResetProgress } = await import("./reset-progress");

async function openDialog() {
  const user = userEvent.setup();
  render(<ResetProgress />, { wrapper });
  await user.click(screen.getByRole("button", { name: "Lernstand zurücksetzen" }));
  await screen.findByRole("alertdialog");
  return user;
}

beforeEach(() => {
  resetLearningProgress.mockReset();
});

describe("ResetProgress", () => {
  it("fragt erst nach und setzt nichts zurück, bevor bestätigt wird", async () => {
    render(<ResetProgress />, { wrapper });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Lernstand zurücksetzen" }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    expect(resetLearningProgress).not.toHaveBeenCalled();
  });

  it("bricht ab, ohne etwas zu löschen", async () => {
    const user = await openDialog();
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(resetLearningProgress).not.toHaveBeenCalled();
  });

  it("setzt nach der Bestätigung zurück und meldet es", async () => {
    resetLearningProgress.mockResolvedValue({ ok: true });
    const user = await openDialog();
    await user.click(screen.getByRole("button", { name: "Endgültig zurücksetzen" }));
    expect((await screen.findByRole("status")).textContent).toBe("Lernstand zurückgesetzt.");
    expect(resetLearningProgress).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("zeigt einen Fehler, wenn das Zurücksetzen abgelehnt wird", async () => {
    resetLearningProgress.mockResolvedValue({ ok: false });
    const user = await openDialog();
    await user.click(screen.getByRole("button", { name: "Endgültig zurücksetzen" }));
    expect((await screen.findByRole("alert")).textContent).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("zeigt einen Fehler, wenn keine Verbindung besteht", async () => {
    resetLearningProgress.mockRejectedValue(new Error("offline"));
    const user = await openDialog();
    await user.click(screen.getByRole("button", { name: "Endgültig zurücksetzen" }));
    expect((await screen.findByRole("alert")).textContent).toBeTruthy();
  });
});
