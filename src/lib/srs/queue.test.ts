import { describe, expect, it } from "vitest";
import { buildQueue, effectiveNewLimit } from "./queue";

const now = new Date("2026-11-11T10:00:00Z");
const order = ["r-2", "r-3", "r-4", "r-5"];

describe("buildQueue", () => {
  it("returns due cards by due date and the remaining new-card budget", () => {
    const q = buildQueue({
      order,
      states: [
        { cardId: "r-3", due: new Date("2026-11-10T08:00:00Z") },
        { cardId: "r-2", due: new Date("2026-11-11T20:00:00Z") },
        { cardId: "r-9999", due: new Date("2026-11-01T00:00:00Z") },
      ],
      now,
      newPerDay: 2,
      introducedToday: 1,
    });
    expect(q).toEqual({ due: ["r-3", "r-2"], fresh: ["r-4"] });
  });

  it("gives no new cards once the daily budget is used", () => {
    expect(buildQueue({ order, states: [], now, newPerDay: 2, introducedToday: 5 }).fresh).toEqual([]);
  });

  it("excludes cards due after the end of the Berlin day", () => {
    const q = buildQueue({
      order,
      states: [{ cardId: "r-2", due: new Date("2026-11-11T23:00:00Z") }],
      now,
      newPerDay: 0,
      introducedToday: 0,
    });
    expect(q.due).toEqual([]);
  });
});

describe("effectiveNewLimit", () => {
  it("is newPerDay without an allowance", () => {
    expect(effectiveNewLimit({ newPerDay: 10, extraNewDay: null, extraNewCount: 0 }, now)).toBe(10);
  });

  it("adds an allowance granted for today", () => {
    expect(effectiveNewLimit({ newPerDay: 10, extraNewDay: "2026-11-11", extraNewCount: 5 }, now)).toBe(15);
  });

  it("ignores a stale allowance from yesterday", () => {
    expect(effectiveNewLimit({ newPerDay: 10, extraNewDay: "2026-11-10", extraNewCount: 5 }, now)).toBe(10);
  });

  it("follows the Berlin day boundary, not UTC", () => {
    const allowance = { newPerDay: 10, extraNewDay: "2026-11-11", extraNewCount: 5 };
    // 22:59 UTC is 23:59 in Berlin (CET), still 11 November.
    expect(effectiveNewLimit(allowance, new Date("2026-11-11T22:59:00Z"))).toBe(15);
    // 23:00 UTC is midnight in Berlin: 12 November, the allowance has expired.
    expect(effectiveNewLimit(allowance, new Date("2026-11-11T23:00:00Z"))).toBe(10);
    // 23:30 UTC on 10 November is already 11 November in Berlin.
    expect(effectiveNewLimit(allowance, new Date("2026-11-10T23:30:00Z"))).toBe(15);
  });
});
