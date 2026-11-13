import { describe, expect, it } from "vitest";
import { CARDS, cardById } from "@/lib/cards";
import {
  ALL_EXTRA_CARDS,
  EXTRA_CARD_COUNTS,
  EXTRA_KINDS,
  extraKindOf,
  isCardOn,
  isExtraKind,
  NO_EXTRA_CARDS,
} from "./extra-cards";

const card = (id: string) => cardById(id)!;

describe("extraKindOf", () => {
  it("gives the switch of each extra card and none for the core cards", () => {
    expect(extraKindOf(card("d-16"))).toBe("singleDouble");
    expect(extraKindOf(card("n-170-0-S1"))).toBe("neighbours");
    expect(extraKindOf(card("o-199"))).toBe("over170");
    for (const id of ["r-170", "m-170-0", "b-159", "t-125"]) expect(extraKindOf(card(id))).toBeNull();
  });

  it("knows the number of cards behind each switch", () => {
    for (const kind of EXTRA_KINDS) {
      expect(CARDS.filter((c) => extraKindOf(c) === kind), kind).toHaveLength(EXTRA_CARD_COUNTS[kind]);
    }
    expect(EXTRA_CARD_COUNTS).toEqual({ singleDouble: 19, neighbours: 202, over170: 60 });
  });
});

describe("isCardOn", () => {
  it("always keeps the core cards", () => {
    expect(isCardOn(card("r-170"), NO_EXTRA_CARDS)).toBe(true);
  });

  it("keeps an extra card only with its switch on", () => {
    expect(isCardOn(card("o-199"), NO_EXTRA_CARDS)).toBe(false);
    expect(isCardOn(card("o-199"), { ...NO_EXTRA_CARDS, over170: true })).toBe(true);
    expect(isCardOn(card("o-199"), { ...ALL_EXTRA_CARDS, over170: false })).toBe(false);
  });
});

describe("isExtraKind", () => {
  it.each(EXTRA_KINDS)("accepts %s", (kind) => {
    expect(isExtraKind(kind)).toBe(true);
  });

  it.each(["admin", "over170 ", "Over170", "", 1, null, undefined, {}, ["over170"]])("rejects %s", (value) => {
    expect(isExtraKind(value)).toBe(false);
  });
});
