import { describe, expect, it } from "vitest";
import { streakLabel } from "./streak";

describe("streakLabel", () => {
  it("gibt für 0 und negative Serien null zurück", () => {
    expect(streakLabel(0)).toBeNull();
    expect(streakLabel(-3)).toBeNull();
  });
  it("nutzt die Einzahl bei 1", () => {
    expect(streakLabel(1)).toBe("1 Tag Serie");
  });
  it("nutzt die Mehrzahl ab 2", () => {
    expect(streakLabel(2)).toBe("2 Tage Serie");
    expect(streakLabel(30)).toBe("30 Tage Serie");
  });
});
