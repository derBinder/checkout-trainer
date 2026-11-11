import { describe, expect, it } from "vitest";
import {
  initStudy,
  isFinished,
  nextToSend,
  retryDelayMs,
  studyReducer,
  type StudyAction,
  type StudyState,
} from "./study-state";

const run = (s: StudyState, ...actions: StudyAction[]) => actions.reduce(studyReducer, s);
const reveal: StudyAction = { type: "reveal" };
const rate = (rating: 1 | 2 | 3 | 4): StudyAction => ({ type: "rate", rating });
const sent: StudyAction = { type: "sending" };
const ok: StudyAction = { type: "result", outcome: "ok" };
const stale: StudyAction = { type: "result", outcome: "stale" };
const skipped: StudyAction = { type: "result", outcome: "skipped" };
const failed: StudyAction = { type: "failed" };

describe("studyReducer", () => {
  it("sends the stored reps for the first rating of a card", () => {
    const s = run(initStudy(["a", "b"], { a: 4 }), reveal, rate(3));
    expect(nextToSend(s)).toEqual({ cardId: "a", rating: 3, reps: 4 });
  });

  it("sends one rating at a time", () => {
    const s = run(initStudy(["a", "b"], {}), reveal, rate(3), sent, reveal, rate(3));
    expect(nextToSend(s)).toBeNull();
    expect(nextToSend(run(s, ok))).toEqual({ cardId: "b", rating: 3, reps: 0 });
  });

  it("keeps a failed save queued and is not finished", () => {
    const s = run(initStudy(["a"], {}), reveal, rate(3), sent, failed);
    expect(s.session.queue).toEqual([]);
    expect(s.session.unsynced).toHaveLength(1);
    expect(s.failed).toBe(true);
    expect(isFinished(s)).toBe(false);
  });

  it("does not resend while failed until a retry", () => {
    const s = run(initStudy(["a"], {}), reveal, rate(3), sent, failed);
    expect(nextToSend(s)).toBeNull();
    expect(nextToSend(run(s, { type: "retry" }))).not.toBeNull();
  });

  it("re-sends the identical payload after a failure", () => {
    const before = run(initStudy(["a", "b"], { a: 2 }), reveal, rate(1));
    const first = nextToSend(before);
    const after = run(before, sent, failed, reveal, rate(3), { type: "retry" });
    expect(nextToSend(after)).toEqual(first);
  });

  it("allows a new attempt when the next card is rated", () => {
    const s = run(initStudy(["a", "b"], {}), reveal, rate(3), sent, failed, reveal, rate(3));
    expect(s.failed).toBe(false);
    expect(nextToSend(s)).toEqual({ cardId: "a", rating: 3, reps: 0 });
  });

  it("finishes only when the queue and the unsynced ratings are empty", () => {
    let s = run(initStudy(["a"], {}), reveal, rate(3));
    expect(s.session.queue).toEqual([]);
    expect(isFinished(s)).toBe(false);
    s = run(s, sent, ok);
    expect(isFinished(s)).toBe(true);
  });

  it("counts confirmed ratings for a card rated Again and then Good", () => {
    let s = run(initStudy(["a"], { a: 5 }), reveal, rate(1));
    expect(nextToSend(s)).toEqual({ cardId: "a", rating: 1, reps: 5 });
    s = run(s, reveal, rate(3));
    s = run(s, sent, ok);
    expect(nextToSend(s)).toEqual({ cardId: "a", rating: 3, reps: 6 });
  });

  it("counts a stale result as confirmed", () => {
    const s = run(initStudy(["a"], { a: 1 }), reveal, rate(1), reveal, rate(3), sent, stale);
    expect(s.confirmedReps.a).toBe(2);
    expect(nextToSend(s)).toEqual({ cardId: "a", rating: 3, reps: 2 });
  });

  it("does not count a skipped rating and notes it", () => {
    const s = run(initStudy(["a", "b"], {}), reveal, rate(1), sent, skipped);
    expect(s.confirmedReps.a ?? 0).toBe(0);
    expect(s.skipped).toBe(1);
    expect(s.session.unsynced).toEqual([]);
  });

  it("sends a later rating of the same card after a skip with the confirmed reps", () => {
    let s = run(initStudy(["a", "b", "c"], { a: 3 }), reveal, rate(1));
    s = run(s, sent, skipped);
    s = run(s, reveal, rate(3), reveal, rate(3), reveal, rate(3));
    expect(s.session.queue).toEqual([]);
    expect(nextToSend(s)).toEqual({ cardId: "b", rating: 3, reps: 0 });
    s = run(s, sent, ok, sent, ok);
    expect(nextToSend(s)).toEqual({ cardId: "a", rating: 3, reps: 3 });
  });

  it("resets the failure count after a success", () => {
    let s = run(initStudy(["a", "b"], {}), reveal, rate(3), sent, failed, { type: "retry" }, sent, failed);
    expect(s.failures).toBe(2);
    s = run(s, { type: "retry" }, sent, ok);
    expect(s.failures).toBe(0);
  });
});

describe("retryDelayMs", () => {
  it("backs off and stays short", () => {
    expect(retryDelayMs(1)).toBe(2000);
    expect(retryDelayMs(2)).toBe(4000);
    expect(retryDelayMs(3)).toBe(8000);
    expect(retryDelayMs(10)).toBe(15000);
  });
});
