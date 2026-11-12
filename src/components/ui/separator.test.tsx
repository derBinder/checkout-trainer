// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Separator } from "./separator";

describe("Separator", () => {
  it("trennt standardmäßig waagerecht", () => {
    render(<Separator />);
    expect(screen.getByRole("separator").getAttribute("aria-orientation")).toBe("horizontal");
  });

  it("trennt auf Wunsch senkrecht", () => {
    render(<Separator orientation="vertical" className="mx-2" />);
    const separator = screen.getByRole("separator");
    expect(separator.getAttribute("aria-orientation")).toBe("vertical");
    expect(separator.className).toContain("mx-2");
  });
});
