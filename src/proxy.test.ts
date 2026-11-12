import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function request(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(new URL(path, "http://localhost:3000"), init);
}

describe("proxy", () => {
  it("ergänzt die Sprache und behält die Suchparameter", () => {
    const response = proxy(request("/today?from=mail", { headers: { "accept-language": "de" } }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/de/today?from=mail");
  });

  it("leitet die Startseite ohne Sprache nach der Vorgabe um", () => {
    const response = proxy(request("/"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/en");
    expect(proxy(request("/sign-in?x=1")).headers.get("location")).toBe(
      "http://localhost:3000/en/sign-in?x=1",
    );
  });

  it("nimmt die Sprache aus dem Cookie des Umschalters", () => {
    const response = proxy(request("/stats", { headers: { cookie: "lang=de", "accept-language": "en" } }));
    expect(response.headers.get("location")).toBe("http://localhost:3000/de/stats");
  });

  it("schickt geschützte Seiten ohne Sitzungs-Cookie zur Anmeldung, ohne Suchparameter", () => {
    const response = proxy(request("/de/stats?tab=1"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/de/sign-in");
  });

  it("reicht die Sprache als Header an die Seite weiter", () => {
    const response = proxy(request("/en/sign-in"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-locale")).toBe("en");
  });

  it("lässt Server Actions ohne Sprache unverändert durch", () => {
    const response = proxy(request("/today", { method: "POST" }));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-locale")).toBeNull();
  });
});
