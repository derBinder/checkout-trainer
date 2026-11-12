// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

function Example({ showCloseButton }: { showCloseButton?: boolean }) {
  return (
    <Sheet>
      <SheetTrigger>Details</SheetTrigger>
      <SheetContent showCloseButton={showCloseButton}>
        <SheetHeader>
          <SheetTitle>Rest 40</SheetTitle>
          <SheetDescription>Direkt auf das Doppel.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose>Fertig</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("öffnet über den Auslöser mit Titel und Beschreibung", async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Details" }));
    const dialog = await screen.findByRole("dialog", { name: "Rest 40" });
    expect(dialog.getAttribute("data-side")).toBe("right");
    expect(within(dialog).getByText("Direkt auf das Doppel.")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Schließen" })).toBeTruthy();
  });

  it("schließt über einen eigenen Schließen-Knopf", async () => {
    const user = userEvent.setup();
    render(<Example showCloseButton={false} />);
    await user.click(screen.getByRole("button", { name: "Details" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "Schließen" })).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "Fertig" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
