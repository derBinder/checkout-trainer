// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Sprache aus dem ersten URL-Segment, hier umschaltbar.
const rootParams = vi.hoisted(() => ({ lang: "de" }));
vi.mock("next/root-params", () => ({ lang: async () => rootParams.lang }));

const { default: NotFound } = await import("./not-found");
const { default: MissingPage } = await import("./[...missing]/page");

beforeEach(() => {
  rootParams.lang = "de";
});

describe("Unbekannte Adresse unter einer Sprache", () => {
  it("meldet die fehlende Seite auf Deutsch und führt zur Startseite", async () => {
    render(await NotFound());
    expect(screen.getByRole("heading", { level: 1, name: "Seite nicht gefunden" })).toBeTruthy();
    expect(screen.getByText("Diese Adresse gibt es nicht.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Zur Startseite" }).getAttribute("href")).toBe("/de");
  });

  it("meldet die fehlende Seite auf Englisch", async () => {
    rootParams.lang = "en";
    render(await NotFound());
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeTruthy();
    expect(screen.getByText("There is no page at this address.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to the home page" }).getAttribute("href")).toBe("/en");
  });

  it("löst über die Sammelroute die Fehlerseite aus", () => {
    expect(() => MissingPage()).toThrowError(expect.objectContaining({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" }));
  });
});
