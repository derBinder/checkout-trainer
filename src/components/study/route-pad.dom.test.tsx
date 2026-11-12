// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Ring } from "@/lib/darts/model";
import type { InputState } from "./route-input";
import { RoutePad } from "./route-pad";

function state(ring: Ring, darts: string[] = [], max: 1 | 2 | 3 = 3): InputState {
  return { ring, darts, ringsBefore: darts.map(() => ring), rest: 121, max };
}

function setup(s: InputState) {
  const user = userEvent.setup();
  const onAction = vi.fn();
  render(<RoutePad state={s} onAction={onAction} />);
  return { user, onAction };
}

const button = (name: string) => screen.getByRole("button", { name });
const isDisabled = (name: string) => button(name).hasAttribute("disabled");

describe("RoutePad", () => {
  it("zeigt den gewählten Ring in der Ring-Auswahl und in den Namen der Zahlentasten", () => {
    setup(state("T"));
    const rings = screen.getAllByRole("radio");
    expect(rings.map((r) => [r.getAttribute("aria-label"), r.getAttribute("aria-checked")])).toEqual([
      ["Single", "false"],
      ["Doppel", "false"],
      ["Triple", "true"],
    ]);
    expect(button("Triple 20").textContent).toBe("20");
    expect(screen.queryByRole("button", { name: "Single 20" })).toBeNull();
  });

  it("benennt die Zahlentasten nach dem Ring", () => {
    setup(state("D"));
    for (let n = 1; n <= 20; n++) expect(button(`Doppel ${n}`)).toBeTruthy();
    expect(button("Single Bull 25").textContent).toBe("25");
    expect(button("Bull")).toBeTruthy();
  });

  it("meldet Ringwechsel, Zahlen, 25, Bull und Löschen", async () => {
    const { user, onAction } = setup(state("S", ["T20"]));
    await user.click(screen.getByRole("radio", { name: "Doppel" }));
    await user.click(button("Single 7"));
    await user.click(button("Single Bull 25"));
    await user.click(button("Bull"));
    await user.click(button("Letzten Dart löschen"));
    expect(onAction.mock.calls.map(([a]) => a)).toEqual([
      { type: "ring", ring: "D" },
      { type: "number", n: 7 },
      { type: "outer" },
      { type: "bull" },
      { type: "undo" },
    ]);
  });

  it("sperrt Löschen, solange nichts eingegeben ist", async () => {
    const { user, onAction } = setup(state("S"));
    expect(isDisabled("Letzten Dart löschen")).toBe(true);
    expect(isDisabled("Single 20")).toBe(false);
    await user.click(button("Letzten Dart löschen"));
    expect(onAction).not.toHaveBeenCalled();
  });

  it("sperrt bei voller Eingabe alle Feldtasten, Ring und Löschen bleiben", async () => {
    const { user, onAction } = setup(state("D", ["T20", "T11", "D14"]));
    for (let n = 1; n <= 20; n++) expect(isDisabled(`Doppel ${n}`)).toBe(true);
    expect(isDisabled("Single Bull 25")).toBe(true);
    expect(isDisabled("Bull")).toBe(true);
    expect(isDisabled("Letzten Dart löschen")).toBe(false);
    for (const radio of screen.getAllByRole("radio")) expect(radio.hasAttribute("disabled")).toBe(false);

    await user.click(button("Doppel 20"));
    expect(onAction).not.toHaveBeenCalled();
    await user.click(screen.getByRole("radio", { name: "Single" }));
    expect(onAction).toHaveBeenLastCalledWith({ type: "ring", ring: "S" });
  });

  it("ist schon nach einem Dart voll, wenn nur einer in der Hand ist", () => {
    setup(state("S", ["S20"], 1));
    expect(isDisabled("Single 1")).toBe(true);
    expect(isDisabled("Letzten Dart löschen")).toBe(false);
  });
});
