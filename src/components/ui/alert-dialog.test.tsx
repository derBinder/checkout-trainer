// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

function Example() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger>Konto löschen</AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>!</AlertDialogMedia>
            <AlertDialogTitle>Konto wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>Das lässt sich nicht rückgängig machen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDone(true);
                setOpen(false);
              }}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {done ? <p>Gelöscht</p> : null}
    </>
  );
}

describe("AlertDialog", () => {
  it("fragt mit Titel und Beschreibung nach und führt die Aktion aus", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Konto löschen" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Konto wirklich löschen?" });
    expect(dialog.getAttribute("data-size")).toBe("sm");
    expect(within(dialog).getByText("Das lässt sich nicht rückgängig machen.")).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Löschen" }));
    expect(screen.getByText("Gelöscht")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("schließt beim Abbrechen, ohne die Aktion auszuführen", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Konto löschen" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Abbrechen" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.queryByText("Gelöscht")).toBeNull();
  });
});
