import { describe, expect, it } from "vitest";
import { initSession, sessionReducer, type SessionState } from "./session";

const reveal = (s: SessionState) => sessionReducer(s, { type: "reveal" });

describe("sessionReducer", () => {
  it("starts with the given queue", () => {
    expect(initSession(["a", "b"])).toEqual({ queue: ["a", "b"], revealed: false, done: 0, total: 2, unsynced: [] });
  });

  it("ignores rating while the card is hidden", () => {
    const s = initSession(["a", "b", "c", "d", "e"]);
    expect(sessionReducer(s, { type: "rate", rating: 3, reps: 0 })).toEqual(s);
  });

  it("re-inserts an 'Again' card three places later and tracks it as unsynced", () => {
    let s = initSession(["a", "b", "c", "d", "e"]);
    s = sessionReducer(reveal(s), { type: "rate", rating: 1, reps: 0 });
    expect(s.queue).toEqual(["b", "c", "d", "a", "e"]);
    expect(s.revealed).toBe(false);
    expect(s.total).toBe(6);
    expect(s.unsynced).toEqual([{ cardId: "a", rating: 1, reps: 0 }]);
    expect(sessionReducer(s, { type: "saveFailed", cardId: "a" }).unsynced).toHaveLength(1);
    expect(sessionReducer(s, { type: "saved", cardId: "a" }).unsynced).toHaveLength(0);
  });

  it("appends an 'Again' card at the end of a short queue", () => {
    let s = initSession(["a", "b"]);
    s = sessionReducer(reveal(s), { type: "rate", rating: 1, reps: 2 });
    expect(s.queue).toEqual(["b", "a"]);
  });

  it("removes a passed card and counts it as done", () => {
    let s = initSession(["a", "b"]);
    s = sessionReducer(reveal(s), { type: "rate", rating: 3, reps: 1 });
    expect(s.queue).toEqual(["b"]);
    expect(s.done).toBe(1);
    expect(s.total).toBe(2);
  });

  it("does nothing when the queue is empty", () => {
    const s = initSession([]);
    expect(sessionReducer(reveal(s), { type: "rate", rating: 3, reps: 0 })).toEqual(reveal(s));
  });
});
