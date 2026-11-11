import { dayEnd } from "../time";

export function buildQueue(input: {
  order: string[];
  states: { cardId: string; due: Date }[];
  now: Date;
  newPerDay: number;
  introducedToday: number;
}): { due: string[]; fresh: string[] } {
  const { order, states, now, newPerDay, introducedToday } = input;
  const known = new Set(order);
  const end = dayEnd(now).getTime();

  const due = states
    .filter((s) => known.has(s.cardId) && s.due.getTime() <= end)
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .map((s) => s.cardId);

  const seen = new Set(states.map((s) => s.cardId));
  const budget = Math.max(0, newPerDay - introducedToday);
  const fresh = order.filter((id) => !seen.has(id)).slice(0, budget);

  return { due, fresh };
}
