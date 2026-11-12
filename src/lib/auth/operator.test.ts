import { describe, expect, it } from "vitest";
import type { SessionUser } from "./guard";
import { isActiveOperator } from "./operator";

const base: SessionUser = {
  id: "u1",
  email: "a@example.test",
  name: "A",
  status: "active",
  role: "admin",
  newPerDay: 10,
};

describe("isActiveOperator", () => {
  it("erkennt den freigeschalteten Betreiber", () => {
    expect(isActiveOperator(base)).toBe(true);
  });

  it("verneint ohne Sitzung, für normale Nutzer und für nicht freigeschaltete Betreiber", () => {
    expect(isActiveOperator(null)).toBe(false);
    expect(isActiveOperator({ ...base, role: "user" })).toBe(false);
    expect(isActiveOperator({ ...base, status: "pending" })).toBe(false);
    expect(isActiveOperator({ ...base, status: "blocked" })).toBe(false);
  });
});
