import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("Projektgerüst", () => {
  it("löst den Alias @ auf und führt Tests aus", () => {
    expect(cn("a", "b")).toBe("a b");
  });
});
