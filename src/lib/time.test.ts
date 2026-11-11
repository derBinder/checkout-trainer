import { describe, expect, it } from "vitest";
import { dayEnd, dayKey, dayStart } from "./time";

describe("dayKey", () => {
  it("uses the Europe/Berlin day across the March 2026 DST change", () => {
    expect(dayKey(new Date("2026-03-28T22:59:00Z"))).toBe("2026-03-28");
    expect(dayKey(new Date("2026-03-28T23:01:00Z"))).toBe("2026-03-29");
    expect(dayKey(new Date("2026-03-29T21:59:00Z"))).toBe("2026-03-29");
    expect(dayKey(new Date("2026-03-29T22:01:00Z"))).toBe("2026-03-30");
  });
});

describe("dayStart / dayEnd", () => {
  it("returns the Berlin day boundaries as UTC instants (winter)", () => {
    const d = new Date("2026-11-11T10:00:00Z");
    expect(dayStart(d).toISOString()).toBe("2026-11-10T23:00:00.000Z");
    expect(dayEnd(d).toISOString()).toBe("2026-11-11T22:59:59.999Z");
  });

  it("handles the 23-hour spring-forward day", () => {
    const d = new Date("2026-03-29T12:00:00Z");
    expect(dayStart(d).toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(dayEnd(d).toISOString()).toBe("2026-03-29T21:59:59.999Z");
  });

  it("handles the 25-hour fall-back day", () => {
    const d = new Date("2026-10-25T12:00:00Z");
    expect(dayStart(d).toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(dayEnd(d).toISOString()).toBe("2026-10-25T22:59:59.999Z");
  });

  it("keeps the instant inside its own day", () => {
    const d = new Date("2026-06-15T22:30:00Z");
    expect(dayKey(d)).toBe("2026-06-16");
    expect(dayStart(d).getTime()).toBeLessThanOrEqual(d.getTime());
    expect(dayEnd(d).getTime()).toBeGreaterThanOrEqual(d.getTime());
  });
});
