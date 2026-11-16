import { describe, expect, it } from "vitest";
import { forecast, formatDate, formatDay } from "./forecast";

const now = new Date("2026-11-13T10:00:00Z");
const at = (unseen: number, newLeftToday: number, newPerDay: number, when = now) =>
  forecast({ unseen, newLeftToday, newPerDay, now: when });

describe("forecast", () => {
  it("meldet „alle freigeschaltet“, wenn keine Karte mehr ungesehen ist", () => {
    expect(at(0, 10, 10)).toEqual({ kind: "done" });
    expect(at(0, 0, 0)).toEqual({ kind: "done" });
  });

  it("nennt heute, wenn das heute noch offene Kontingent reicht", () => {
    expect(at(5, 10, 10)).toEqual({ kind: "date", day: "2026-11-13" });
    expect(at(10, 10, 10)).toEqual({ kind: "date", day: "2026-11-13" });
  });

  it("verteilt den Rest ab morgen auf die Einstellung", () => {
    // 402 − 10 heute = 392, bei 10 pro Tag 39,2, also 40 Tage nach heute.
    expect(at(402, 10, 10)).toEqual({ kind: "date", day: "2026-12-23" });
    expect(at(11, 10, 10)).toEqual({ kind: "date", day: "2026-11-14" });
  });

  it("zählt bei Einstellung 1 je Karte einen Tag", () => {
    expect(at(3, 0, 1)).toEqual({ kind: "date", day: "2026-11-16" });
  });

  it("rechnet Extrakarten nur für heute", () => {
    // Heute 10 aus der Einstellung plus 10 Extrakarten; ab morgen nur 10.
    expect(at(30, 20, 10)).toEqual({ kind: "date", day: "2026-11-14" });
    expect(at(31, 20, 10)).toEqual({ kind: "date", day: "2026-11-15" });
  });

  it("nennt bei Einstellung 0 ein Datum nur, wenn die Extrakarten von heute reichen", () => {
    expect(at(5, 5, 0)).toEqual({ kind: "date", day: "2026-11-13" });
    expect(at(6, 5, 0)).toEqual({ kind: "none" });
    expect(at(1, 0, 0)).toEqual({ kind: "none" });
  });

  it("zählt nach Berliner Kalendertagen", () => {
    // 23:59 in Berlin gehört noch zum 13. November.
    expect(at(2, 0, 1, new Date("2026-11-13T22:59:59Z"))).toEqual({ kind: "date", day: "2026-11-15" });
    // 00:30 in Berlin ist schon der 14. November.
    expect(at(2, 0, 1, new Date("2026-11-13T23:30:00Z"))).toEqual({ kind: "date", day: "2026-11-16" });
    // Über die Umstellung auf Winterzeit (25. Oktober 2026).
    expect(at(2, 0, 1, new Date("2026-10-24T12:00:00Z"))).toEqual({ kind: "date", day: "2026-10-26" });
    expect(at(40, 0, 1, new Date("2026-10-24T23:30:00Z"))).toEqual({ kind: "date", day: "2026-12-04" });
  });
});

describe("formatDay", () => {
  it("schreibt Tag und Monat in der Sprache der Oberfläche", () => {
    expect(formatDay("2026-12-22", "de", now)).toBe("22. Dezember");
    expect(formatDay("2026-12-22", "en", now)).toBe("22 December");
  });

  it("nennt das Jahr nur, wenn es nicht das laufende ist", () => {
    expect(formatDay("2027-01-14", "de", now)).toBe("14. Januar 2027");
    expect(formatDay("2027-01-14", "en", now)).toBe("14 January 2027");
  });
});

describe("formatDate", () => {
  it("schreibt den Tag numerisch in der Reihenfolge der Sprache", () => {
    expect(formatDate("2026-01-05", "de")).toBe("05.01.2026");
    expect(formatDate("2026-01-05", "en")).toBe("05/01/2026");
  });

  it("nennt das Jahr immer, auch im laufenden", () => {
    expect(formatDate("2026-12-31", "de")).toBe("31.12.2026");
  });
});
