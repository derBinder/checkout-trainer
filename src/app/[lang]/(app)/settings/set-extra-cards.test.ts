import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import type { Db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { EXTRA_KINDS, NO_EXTRA_CARDS } from "@/lib/extra-cards";
import { loadExtraCards } from "@/lib/extra-cards-db";
import { setExtraCards } from "./set-extra-cards";

let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  await db.insert(user).values([
    { id: "u1", name: "u1", email: "u1@x.test", status: "active" },
    { id: "u2", name: "u2", email: "u2@x.test", status: "active" },
  ]);
});

describe("setExtraCards", () => {
  it.each(EXTRA_KINDS)("switches %s on and off again", async (kind) => {
    expect(await setExtraCards(db, "u1", kind, true)).toEqual({ ok: true });
    expect(await loadExtraCards(db, "u1")).toEqual({ ...NO_EXTRA_CARDS, [kind]: true });
    expect(await setExtraCards(db, "u1", kind, false)).toEqual({ ok: true });
    expect(await loadExtraCards(db, "u1")).toEqual(NO_EXTRA_CARDS);
  });

  it.each([
    ["admin", true],
    ["over170 ", true],
    ["extraOver170", true],
    ["__proto__", true],
    ["over170", "true"],
    ["over170", 1],
    ["over170", null],
    [null, true],
    [undefined, undefined],
    [{}, false],
    [["over170"], true],
  ])("rejects %j / %j and changes nothing", async (kind, on) => {
    expect(await setExtraCards(db, "u1", kind, on)).toEqual({ ok: false });
    expect(await loadExtraCards(db, "u1")).toEqual(NO_EXTRA_CARDS);
  });

  it("reports a failure for an account that does not exist", async () => {
    expect(await setExtraCards(db, "unbekannt", "over170", true)).toEqual({ ok: false });
  });

  it("changes only the given account", async () => {
    await setExtraCards(db, "u1", "neighbours", true);
    expect(await loadExtraCards(db, "u2")).toEqual(NO_EXTRA_CARDS);
  });

  it("leaves the other settings of the account alone", async () => {
    await db.update(user).set({ newPerDay: 7, extraOver170: true }).where(eq(user.id, "u1"));
    await setExtraCards(db, "u1", "singleDouble", true);
    const [row] = await db.select().from(user).where(eq(user.id, "u1"));
    expect(row).toMatchObject({ newPerDay: 7, extraOver170: true, extraSingleDouble: true, extraNeighbours: false });
  });
});
