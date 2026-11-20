import { describe, expect, it } from "vitest";
import { dayEnd } from "../time";
import { describeInterval, intervalLabelChain, previewIntervals, rate } from "./fsrs";

const now = new Date("2026-11-11T10:00:00Z");

describe("rate", () => {
  const good = rate(null, 3, now);
  const again = rate(null, 1, now);
  const easy = rate(null, 4, now);

  const hard = rate(null, 2, now);

  it("orders due dates by rating", () => {
    expect(again.due.getTime()).toBeLessThan(good.due.getTime());
    expect(good.due.getTime()).toBeLessThan(easy.due.getTime());
  });

  it("keeps an Again card due right now", () => {
    expect(again.due).toEqual(now);
    expect(again.reps).toBe(1);
    expect(again.lastReview).toEqual(now);
  });

  it("schedules new cards rated Hard or Good beyond today", () => {
    expect(hard.due.getTime()).toBeGreaterThan(dayEnd(now).getTime());
    expect(good.due.getTime()).toBeGreaterThan(dayEnd(now).getTime());
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

  it("counts elapsed days in Berlin days, also in the hour after midnight", () => {
    // Schwer am 10. November um 21:00 in Berlin (UTC+1), wieder gelernt am 12. November.
    const hardOn10th = rate(null, 2, new Date("2026-11-10T20:00:00Z"));
    const at0030 = rate(hardOn10th, 3, new Date("2026-11-11T23:30:00Z")); // 00:30 in Berlin
    const at0130 = rate(hardOn10th, 3, new Date("2026-11-12T00:30:00Z")); // 01:30 in Berlin
    expect(at0030.elapsedDays).toBe(2);
    expect(at0030.stability).toBe(at0130.stability);
    expect(at0130.due.getTime() - at0030.due.getTime()).toBe(60 * 60 * 1000);
    // Gespeichert wird der echte Zeitpunkt, nicht der für die Rechnung verschobene.
    expect(at0030.lastReview).toEqual(new Date("2026-11-11T23:30:00Z"));
  });

  it("counts Berlin days across a daylight saving change", () => {
    // 28. März 23:30 (UTC+1) bis 29. März 23:30 (UTC+2, ein 23-Stunden-Tag): ein Tag.
    const before = rate(null, 3, new Date("2026-03-28T22:30:00Z"));
    expect(rate(before, 3, new Date("2026-03-29T21:30:00Z")).elapsedDays).toBe(1);
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

  it("gives the intervals as data, not as text", () => {
    const p = previewIntervals(null, now);
    expect(p[1]).toEqual({ unit: "now", value: 0 });
    for (const r of [2, 3, 4] as const) expect(p[r]).toMatchObject({ unit: "days" });
  });

  it("describes durations", () => {
    expect(describeInterval(30_000)).toEqual({ unit: "underMinute", value: 0 });
    expect(describeInterval(10 * 60_000)).toEqual({ unit: "minutes", value: 10 });
    expect(describeInterval(3 * 3_600_000)).toEqual({ unit: "hours", value: 3 });
    expect(describeInterval(86_400_000)).toEqual({ unit: "days", value: 1 });
    expect(describeInterval(3 * 86_400_000)).toEqual({ unit: "days", value: 3 });
    expect(describeInterval(60 * 86_400_000)).toEqual({ unit: "months", value: 2 });
    expect(describeInterval(730 * 86_400_000)).toEqual({ unit: "years", value: 2 });
    expect(describeInterval(548 * 86_400_000)).toEqual({ unit: "years", value: 1.5 });
  });
});

describe("intervalLabelChain", () => {
  it("starts with the labels for the stored state", () => {
    const reviewed = rate(rate(null, 3, new Date("2026-10-01T10:00:00Z")), 3, new Date("2026-10-10T10:00:00Z"));
    const chain = intervalLabelChain(reviewed, now);
    expect(chain[0]).toEqual(previewIntervals(reviewed, now));
  });

  it("follows each further Again until the labels stop changing", () => {
    const reviewed = rate(rate(null, 3, new Date("2026-10-01T10:00:00Z")), 3, new Date("2026-10-10T10:00:00Z"));
    const chain = intervalLabelChain(reviewed, now);
    expect(chain[1]).toEqual(previewIntervals(rate(reviewed, 1, now), now));
    expect(chain[1]).not.toEqual(chain[0]);
    expect(chain.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < chain.length; i++) expect(chain[i]).not.toEqual(chain[i - 1]);
  });
});
