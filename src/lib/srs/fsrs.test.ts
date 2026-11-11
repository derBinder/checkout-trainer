import { describe, expect, it } from "vitest";
import { formatInterval, previewIntervals, rate } from "./fsrs";

const now = new Date("2026-11-11T10:00:00Z");

describe("rate", () => {
  const good = rate(null, 3, now);
  const again = rate(null, 1, now);
  const easy = rate(null, 4, now);

  it("orders due dates by rating", () => {
    expect(again.due.getTime()).toBeLessThan(good.due.getTime());
    expect(good.due.getTime()).toBeLessThan(easy.due.getTime());
  });

  it("counts the review", () => {
    expect(good.reps).toBe(1);
    expect(good.lastReview).toEqual(now);
  });

  it("is deterministic", () => {
    expect(rate(null, 3, now)).toEqual(good);
  });

  it("continues from a previous state", () => {
    const later = new Date("2026-11-14T10:00:00Z");
    const next = rate(good, 3, later);
    expect(next.reps).toBe(2);
    expect(next.due.getTime()).toBeGreaterThan(later.getTime());
    expect(next.elapsedDays).toBe(3);
  });

  it("round-trips stored state as plain values", () => {
    const stored = JSON.parse(JSON.stringify(good)) as Record<string, unknown>;
    stored.due = new Date(stored.due as string);
    stored.lastReview = new Date(stored.lastReview as string);
    expect(rate(stored as unknown as typeof good, 3, new Date("2026-11-20T10:00:00Z")).reps).toBe(2);
  });
});

describe("previewIntervals", () => {
  it("has the four ratings in order", () => {
    expect(Object.keys(previewIntervals(null, now))).toEqual(["1", "2", "3", "4"]);
  });

  it("uses short German labels", () => {
    const p = previewIntervals(null, now);
    expect(p[1]).toBe("1 Min");
    expect(p[3]).toBe("10 Min");
    expect(p[4]).toMatch(/^\d+ Tage?$/);
  });

  it("formats durations", () => {
    expect(formatInterval(30_000)).toBe("< 1 Min");
    expect(formatInterval(10 * 60_000)).toBe("10 Min");
    expect(formatInterval(3 * 3_600_000)).toBe("3 Std");
    expect(formatInterval(86_400_000)).toBe("1 Tag");
    expect(formatInterval(3 * 86_400_000)).toBe("3 Tage");
    expect(formatInterval(60 * 86_400_000)).toBe("2 Monate");
    expect(formatInterval(730 * 86_400_000)).toBe("2 Jahre");
  });
});
