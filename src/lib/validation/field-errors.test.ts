import { describe, expect, it } from "vitest";
import {
  fieldErrorsReducer,
  firstInvalid,
  initialFieldErrors,
} from "./field-errors";

describe("fieldErrorsReducer", () => {
  it("zeigt beim Tippen erst nach dem Verlassen einen Hinweis", () => {
    let s = initialFieldErrors;
    s = fieldErrorsReducer(s, { type: "change", name: "email", error: "x" });
    expect(s).toEqual(initialFieldErrors);
    s = fieldErrorsReducer(s, { type: "blur", name: "email", error: "x" });
    expect(s.errors.email).toBe("x");
    expect(s.touched.email).toBe(true);
    s = fieldErrorsReducer(s, { type: "change", name: "email", error: null });
    expect(s.errors.email).toBeNull();
  });

  it("markiert beim Abschicken alle Felder und setzt alle Fehler", () => {
    const s = fieldErrorsReducer(initialFieldErrors, {
      type: "submit",
      errors: { name: "n", email: null, password: "p" },
    });
    expect(s.touched).toEqual({ name: true, email: true, password: true });
    expect(s.errors).toEqual({ name: "n", email: null, password: "p" });
    expect(firstInvalid(["name", "email", "password"], s.errors)).toBe("name");
    expect(fieldErrorsReducer(s, { type: "reset" })).toEqual(
      initialFieldErrors,
    );
  });
});

describe("firstInvalid", () => {
  it("folgt der Reihenfolge und liefert null ohne Fehler", () => {
    expect(firstInvalid(["email"], { email: null })).toBeNull();
    expect(firstInvalid(["b", "a"], { a: "x", b: null })).toBe("a");
    expect(firstInvalid(["x"], {})).toBeNull();
  });
});
