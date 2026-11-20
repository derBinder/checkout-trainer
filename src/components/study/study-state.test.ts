import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TAP_GUARD_MS,
  drainDetached,
  initStudy,
  isFinished,
  nextToSend,
  resultAction,
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

describe("double-tap guard", () => {
  const revealAt = (at: number): StudyAction => ({ type: "reveal", at });
  const rateAt = (rating: 1 | 2 | 3 | 4, at: number): StudyAction => ({ type: "rate", rating, at });

  it("uses a window of about 350 ms", () => {
    expect(TAP_GUARD_MS).toBe(350);
  });

  it("ignores a rating tapped right after the reveal", () => {
    const s = run(initStudy(["a", "b"], {}), revealAt(1000), rateAt(2, 1000 + TAP_GUARD_MS - 1));
    expect(s.session.revealed).toBe(true);
    expect(s.session.unsynced).toEqual([]);
    expect(s.session.queue).toEqual(["a", "b"]);
  });

  it("counts a rating tapped after the window", () => {
    const s = run(initStudy(["a", "b"], {}), revealAt(1000), rateAt(3, 1000 + TAP_GUARD_MS));
    expect(s.session.unsynced).toEqual([{ cardId: "a", rating: 3, reps: 0 }]);
    expect(s.session.queue).toEqual(["b"]);
  });

  it("ignores a reveal tapped right after a rating", () => {
    const s = run(initStudy(["a", "b"], {}), revealAt(1000), rateAt(3, 2000), revealAt(2000 + TAP_GUARD_MS - 1));
    expect(s.session.queue).toEqual(["b"]);
    expect(s.session.revealed).toBe(false);
  });

  it("counts a reveal tapped after the window", () => {
    const s = run(initStudy(["a", "b"], {}), revealAt(1000), rateAt(3, 2000), revealAt(2000 + TAP_GUARD_MS));
    expect(s.session.revealed).toBe(true);
  });

  it("does not hold back the first reveal of a session", () => {
    const s = run(initStudy(["a"], {}), revealAt(0));
    expect(s.session.revealed).toBe(true);
  });
});

describe("signed out", () => {
  it("stops sending and keeps the unsynced ratings for the notice", () => {
    let s = run(initStudy(["a", "b", "c"], {}), reveal, rate(3), reveal, rate(2), sent);
    s = run(s, { type: "signedOut" });
    expect(s.signedOut).toBe(true);
    expect(s.sending).toBe(false);
    expect(s.session.unsynced).toHaveLength(2);
    expect(nextToSend(s)).toBeNull();
    expect(nextToSend(run(s, { type: "retry" }))).toBeNull();
  });

  it("ignores further taps once signed out", () => {
    const s = run(initStudy(["a", "b"], {}), reveal, rate(3), sent, { type: "signedOut" }, reveal, rate(3));
    expect(s.session.queue).toEqual(["b"]);
    expect(s.session.unsynced).toHaveLength(1);
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

describe("typed answer", () => {
  const typed: StudyAction = { type: "reveal", answer: { kind: "darts", darts: ["T20", "D20"] } };

  it("keeps the typed answer when revealing", () => {
    expect(run(initStudy(["a"], {}), typed).answer).toEqual({ kind: "darts", darts: ["T20", "D20"] });
  });

  it("reveals without an answer as null", () => {
    expect(run(initStudy(["a"], {}), reveal).answer).toBeNull();
  });

  it("drops the answer when rating, also on Nochmal", () => {
    expect(run(initStudy(["a", "b"], {}), typed, rate(3)).answer).toBeNull();
    const again = run(initStudy(["a", "b"], {}), typed, rate(1));
    expect(again.answer).toBeNull();
    expect(again.session.queue).toContain("a");
  });

  it("an ignored reveal keeps the answer unchanged", () => {
    const s = run(initStudy(["a", "b"], {}), { ...typed, at: 1000 }, { type: "rate", rating: 3, at: 2000 });
    const tooSoon = run(s, { type: "reveal", at: 2000 + TAP_GUARD_MS - 1, answer: { kind: "notCheckable" } });
    expect(tooSoon.session.revealed).toBe(false);
    expect(tooSoon.answer).toBeNull();
  });
});

describe("studyReducer ohne Speichern (Übung)", () => {
  it("legt keine Bewertung zum Senden ab und ist am Ende fertig", () => {
    const s = run(initStudy(["a", "b"], {}, { save: false }), reveal, rate(3), reveal, rate(3));
    expect(s.session.unsynced).toEqual([]);
    expect(nextToSend(s)).toBeNull();
    expect(s.session.done).toBe(2);
    expect(isFinished(s)).toBe(true);
  });

  it("stellt eine Karte nach „Nochmal“ trotzdem nach hinten", () => {
    const s = run(initStudy(["a", "b", "c", "d", "e"], {}, { save: false }), reveal, rate(1));
    expect(s.session.queue).toEqual(["b", "c", "d", "a", "e"]);
    expect(s.session.total).toBe(6);
    expect(s.session.unsynced).toEqual([]);
  });

  it("speichert ohne Angabe wie bisher", () => {
    expect(initStudy(["a"], {}).save).toBe(true);
  });
});

describe("resultAction", () => {
  it("maps the server answer to a reducer action", () => {
    expect(resultAction({ ok: true })).toEqual({ type: "result", outcome: "ok" });
    expect(resultAction({ ok: false, reason: "stale" })).toEqual({ type: "result", outcome: "stale" });
    expect(resultAction({ ok: false, reason: "limit" })).toEqual({ type: "result", outcome: "skipped" });
    expect(resultAction({ ok: false, reason: "auth" })).toEqual({ type: "signedOut" });
  });
});

describe("drainDetached", () => {
  afterEach(() => vi.useRealTimers());

  type Sent = { cardId: string; rating: number; reps: number };
  type Answer = { ok: true } | { ok: false; reason: string };

  /** Ein Server zum Mitschreiben; jede Antwort kommt erst, wenn der Test sie freigibt. */
  function server() {
    const calls: Sent[] = [];
    const pending: ((a: Answer | Error) => void)[] = [];
    const send = (o: Sent) => {
      calls.push(o);
      return new Promise<Answer>((resolve, reject) =>
        pending.push((a) => (a instanceof Error ? reject(a) : resolve(a))),
      );
    };
    const answer = async (a: Answer | Error) => {
      pending.shift()!(a);
      // Die Schleife läuft über mehrere Mikroaufgaben weiter.
      for (let i = 0; i < 5; i++) await Promise.resolve();
    };
    return { calls, send, answer };
  }

  // Karte a: „Nochmal“, dann „Gut“; Karte b: „Gut“. Der Kopf ist schon unterwegs.
  const snapshot = () => run(initStudy(["a", "b"], { a: 4 }), reveal, rate(1), sent, reveal, rate(3), reveal, rate(3));

  it("sends the open ratings one after another, with reps counted from the confirmed ones", async () => {
    const s = server();
    drainDetached(snapshot(), s.send);
    expect(s.calls).toEqual([{ cardId: "a", rating: 1, reps: 4 }]);
    await s.answer({ ok: true });
    // Die zweite Bewertung derselben Karte erst nach der ersten, mit einer Wiederholung mehr.
    expect(s.calls.at(-1)).toEqual({ cardId: "b", rating: 3, reps: 0 });
    await s.answer({ ok: true });
    expect(s.calls.at(-1)).toEqual({ cardId: "a", rating: 3, reps: 5 });
    await s.answer({ ok: true });
    expect(s.calls).toHaveLength(3);
  });

  it("counts a stale head as saved and a skipped one as not counted", async () => {
    const s = server();
    drainDetached(snapshot(), s.send);
    await s.answer({ ok: false, reason: "stale" });
    await s.answer({ ok: false, reason: "limit" });
    expect(s.calls.at(-1)).toEqual({ cardId: "a", rating: 3, reps: 5 });
  });

  it("retries after a failed request with the usual back-off", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const s = server();
    drainDetached(run(initStudy(["a"], {}), reveal, rate(3)), s.send);
    await s.answer(new Error("offline"));
    expect(s.calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(retryDelayMs(1));
    expect(s.calls).toEqual([
      { cardId: "a", rating: 3, reps: 0 },
      { cardId: "a", rating: 3, reps: 0 },
    ]);
  });

  it("stops after a signed-out answer", async () => {
    const s = server();
    drainDetached(snapshot(), s.send);
    await s.answer({ ok: false, reason: "auth" });
    expect(s.calls).toHaveLength(1);
  });

  it("sends nothing more once stopped; the request on its way still finishes", async () => {
    const s = server();
    const stop = drainDetached(snapshot(), s.send);
    stop();
    await s.answer({ ok: true });
    expect(s.calls).toHaveLength(1);
  });

  it("does nothing without open ratings or after signing out", () => {
    const s = server();
    drainDetached(initStudy(["a"], {}), s.send);
    drainDetached(run(snapshot(), { type: "signedOut" }), s.send);
    expect(s.calls).toHaveLength(0);
  });
});
