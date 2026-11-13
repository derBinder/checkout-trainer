import { describe, expect, it } from "vitest";
import { CARD_ORDER, CARDS, cardOrderFor, cardsFor } from "./cards";
import { ALL_EXTRA_CARDS, extraKindOf, NO_EXTRA_CARDS } from "./extra-cards";

describe("cardOrderFor", () => {
  it("keeps the 402 core cards in their order with all switches off", () => {
    const core = CARDS.filter((c) => extraKindOf(c) === null).map((c) => c.id);
    expect(core).toHaveLength(402);
    expect(cardOrderFor(NO_EXTRA_CARDS)).toEqual(core);
  });

  it("gives all cards with all switches on", () => {
    expect(cardOrderFor(ALL_EXTRA_CARDS)).toEqual(CARD_ORDER);
  });

  it("adds only the cards of the switches that are on", () => {
    expect(cardOrderFor({ ...NO_EXTRA_CARDS, over170: true })).toHaveLength(462);
    expect(cardOrderFor({ ...NO_EXTRA_CARDS, singleDouble: true })).toHaveLength(421);
    expect(cardOrderFor({ ...NO_EXTRA_CARDS, neighbours: true })).toHaveLength(604);
  });

  it("returns the same list for the same switches", () => {
    expect(cardOrderFor({ ...NO_EXTRA_CARDS })).toBe(cardOrderFor(NO_EXTRA_CARDS));
  });
});

describe("cardsFor", () => {
  it("gives the cards in the same order as cardOrderFor", () => {
    const extras = { ...NO_EXTRA_CARDS, neighbours: true };
    expect(cardsFor(extras).map((c) => c.id)).toEqual(cardOrderFor(extras));
  });
});
