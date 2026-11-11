import { describe, expect, it } from "vitest";
import { passwordStrength, strengthHint } from "./password-strength";

describe("passwordStrength", () => {
  it("liefert null bei leerem Wert", () => {
    expect(passwordStrength("")).toBeNull();
  });

  it("bewertet zu kurze Passwörter immer als Schwach", () => {
    expect(passwordStrength("abc")).toMatchObject({
      level: 0,
      label: "Schwach",
      percent: 25,
    });
    expect(passwordStrength("Aa1!Aa1!x")!.level).toBe(0);
  });

  it("zieht für naheliegende Bestandteile und Wiederholung ab", () => {
    expect(passwordStrength("passwort12")!.level).toBe(0);
    expect(passwordStrength("aaaaaaaaaaaa")!.level).toBe(0);
    expect(passwordStrength("MeinDARTSclub#2024")!.level).toBeLessThan(3);
    expect(passwordStrength("kurzeswort")!.level).toBeLessThanOrEqual(1);
  });

  it("bewertet gute Passwörter hoch", () => {
    expect(passwordStrength("Triple20-und-Bull!")).toMatchObject({
      level: 3,
      label: "Stark",
      percent: 100,
    });
    expect(
      passwordStrength("vier zufällige wörter hier")!.level,
    ).toBeGreaterThanOrEqual(2);
  });

  it("wirft bei ungewöhnlichen Eingaben nicht", () => {
    for (const odd of [
      "ä".repeat(128),
      "x".repeat(128),
      "🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯",
      " ".repeat(40),
    ]) {
      expect(() => passwordStrength(odd)).not.toThrow();
    }
  });

  it("wird mit der Länge nie schwächer", () => {
    let prev = -1;
    for (const p of [
      "Kx7!mqz2Wp",
      "Kx7!mqz2Wp4r",
      "Kx7!mqz2Wp4rTy9",
      "Kx7!mqz2Wp4rTy9#bn",
    ]) {
      const level = passwordStrength(p)!.level;
      expect(level).toBeGreaterThanOrEqual(prev);
      prev = level;
    }
  });
});

describe("strengthHint", () => {
  it("nennt die fehlenden Zeichen und Verbesserungen", () => {
    expect(strengthHint("")).toBe("");
    expect(strengthHint("abc")).toBe("Noch 7 Zeichen bis zum Minimum.");
    expect(strengthHint("abcdefghi")).toBe("Noch 1 Zeichen bis zum Minimum.");
    expect(strengthHint("kurzeswort")).toBe(
      "Länger oder gemischter wird stärker.",
    );
    expect(strengthHint("Triple20-und-Bull!")).toBe("");
  });
});
