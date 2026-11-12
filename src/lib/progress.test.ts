import { describe, expect, it } from "vitest";
import { progressView } from "./progress";

describe("progressView", () => {
  it("zählt begonnene Reste als im Lernen plus sicher", () => {
    const view = progressView({ new: 159, learning: 10, known: 0 });
    expect(view.started).toBe(10);
    expect(view.known).toBe(0);
    expect(view.total).toBe(169);
    expect(view.percent).toBe(6);
  });

  it("zeigt nach der ersten Sitzung einen sichtbaren gelben Abschnitt und keinen schwarzen", () => {
    const view = progressView({ new: 159, learning: 10, known: 0 });
    expect(view.learningWidth).toBeCloseTo((10 / 169) * 100, 5);
    expect(view.knownWidth).toBe(0);
  });

  it("ist ohne Lernstand leer", () => {
    const view = progressView({ new: 169, learning: 0, known: 0 });
    expect(view).toMatchObject({ started: 0, percent: 0, learningWidth: 0, knownWidth: 0 });
  });

  it("hält einen einzelnen Rest sichtbar", () => {
    const view = progressView({ new: 167, learning: 1, known: 1 });
    expect(view.learningWidth).toBe(2);
    expect(view.knownWidth).toBe(2);
  });

  it("füllt den Balken genau, wenn alles sicher ist", () => {
    const view = progressView({ new: 0, learning: 0, known: 169 });
    expect(view.knownWidth).toBe(100);
    expect(view.learningWidth).toBe(0);
    expect(view.percent).toBe(100);
  });

  it("überschreitet zusammen nie die volle Breite", () => {
    const view = progressView({ new: 0, learning: 1, known: 168 });
    expect(view.knownWidth + view.learningWidth).toBeLessThanOrEqual(100);
    expect(view.learningWidth).toBeGreaterThan(0);
  });
});
