import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import type { Db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { NO_EXTRA_CARDS } from "./extra-cards";
import { extraCardsOf, loadExtraCards } from "./extra-cards-db";

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(user).values([
    { id: "u1", name: "u1", email: "u1@x.test", status: "active", extraNeighbours: true },
    { id: "u2", name: "u2", email: "u2@x.test", status: "active", extraOver170: true, extraSingleDouble: true },
  ]);
});

describe("loadExtraCards", () => {
  it("reads the switches of the given account", async () => {
    expect(await loadExtraCards(db, "u1")).toEqual({ singleDouble: false, neighbours: true, over170: false });
    expect(await loadExtraCards(db, "u2")).toEqual({ singleDouble: true, neighbours: false, over170: true });
  });

  it("switches everything off for an unknown account", async () => {
    expect(await loadExtraCards(db, "unbekannt")).toEqual(NO_EXTRA_CARDS);
  });
});

describe("extraCardsOf", () => {
  it("maps the columns to the switches", () => {
    expect(extraCardsOf({ extraSingleDouble: true, extraNeighbours: false, extraOver170: true })).toEqual({
      singleDouble: true,
      neighbours: false,
      over170: true,
    });
  });
});
