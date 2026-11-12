import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { USER_ROW } from "@/components/admin/admin-parts";
import { UserListSkeleton } from "@/components/admin/admin-skeleton";
import { NewPerDayForm, NewPerDayInput } from "@/components/settings/new-per-day-form";
import {
  DeleteAccountSectionSkeleton,
  NewPerDayFieldSkeleton,
} from "@/components/settings/settings-skeleton";
import { StatsOverviewSkeleton } from "@/components/stats/stats-skeleton";
import { StreakChipSkeleton } from "@/components/streak-chip";
import { StudySkeleton } from "@/components/study/study-skeleton";
import { TodayOverviewSkeleton } from "@/components/today/today-skeleton";
import { buttonShape, buttonVariants } from "@/components/ui/button";
import { I18nProvider } from "@/i18n/client";

/** Das Schließen-Kreuz der Lernseite liest die Sprache aus dem I18nProvider des Root-Layouts. */
function studySkeleton(): ReactElement {
  return (
    <I18nProvider locale="de">
      <StudySkeleton />
    </I18nProvider>
  );
}

const SKELETONS: [string, () => ReactElement][] = [
  ["Heute", () => createElement(TodayOverviewSkeleton)],
  ["Statistik", () => createElement(StatsOverviewSkeleton)],
  ["Serien-Schildchen", () => createElement(StreakChipSkeleton)],
  ["Lernen", studySkeleton],
  ["Neue Karten pro Tag", () => createElement(NewPerDayFieldSkeleton)],
  ["Konto löschen", () => createElement(DeleteAccountSectionSkeleton)],
  ["Verwaltung", () => createElement(UserListSkeleton)],
];

function classesOf(tag: string): string[] {
  return (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/).filter(Boolean);
}

function skeletonTags(html: string): string[] {
  return html.match(/<[a-z]+[^>]*data-slot="skeleton"[^>]*>/g) ?? [];
}

/** Blockelemente (div, p, dl, ol …) innerhalb eines span oder p sind kein gültiges HTML. */
function blockInsideSpan(html: string): string | null {
  const stack: string[] = [];
  for (const [, closing, name] of html.matchAll(/<(\/?)([a-z0-9]+)[^>]*?>/g)) {
    if (closing) {
      stack.splice(stack.lastIndexOf(name), 1);
      continue;
    }
    if (["div", "p", "dl", "ol", "ul", "section"].includes(name) && (stack.includes("span") || stack.includes("p"))) {
      return name;
    }
    if (!["input", "br", "img"].includes(name)) stack.push(name);
  }
  return null;
}

describe("Skeleton-Bausteine", () => {
  it("übernehmen Form und Maße des Knopfs aus derselben Quelle wie der echte Knopf", () => {
    const real = new Set(buttonVariants({ size: "xl" }).split(" "));
    const shape = buttonShape("xl").split(" ");
    for (const cls of ["h-13", "px-6", "text-base", "rounded-pill", "border", "border-transparent"]) {
      expect(shape).toContain(cls);
    }
    for (const cls of shape) expect(real).toContain(cls);
  });

  it.each(SKELETONS)("%s: jedes Skeleton trägt genau eine Rundung", (_, render) => {
    const tags = skeletonTags(renderToStaticMarkup(render()));
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(classesOf(tag).filter((cls) => cls.startsWith("rounded-"))).toHaveLength(1);
    }
  });

  it.each(SKELETONS)("%s: keine Blockelemente in span oder p", (_, render) => {
    expect(blockInsideSpan(renderToStaticMarkup(render()))).toBeNull();
  });

  it("Statistik: das neutrale Raster ist für Screenreader versteckt", () => {
    const html = renderToStaticMarkup(createElement(StatsOverviewSkeleton));
    const grid = html.match(/<ol[^>]*>/)?.[0] ?? "";
    expect(grid).toContain('aria-hidden="true"');
  });

  it("Lernen: Gerüst mit Schließen-Kreuz, leerer Fortschrittslinie, drei Feldern und Tastenfeld, als ladend markiert", () => {
    const html = renderToStaticMarkup(studySkeleton());
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('href="/de/today"');
    expect(html).toContain('aria-label="Lernen beenden"');
    expect(html).toContain('data-slot="progress"');
    // Zähler, Beschriftung, Zahl, drei Felder, drei Ring-Segmente, 23 Tasten, drei Knöpfe.
    expect(skeletonTags(html)).toHaveLength(35);
  });

  it("Einstellungen: Beschriftung und Knopf stehen ohne gespeicherten Wert da, das Feld kommt nach", () => {
    const shell = renderToStaticMarkup(<I18nProvider locale="de">{createElement(NewPerDayForm, null, createElement(NewPerDayFieldSkeleton))}</I18nProvider>);
    expect(shell).toContain("Neue Karten pro Tag");
    expect(shell).toContain("Speichern");
    expect(shell).not.toContain("<input");

    const filled = renderToStaticMarkup(<I18nProvider locale="de">{createElement(NewPerDayForm, null, createElement(NewPerDayInput, { initial: 7 }))}</I18nProvider>);
    const input = filled.match(/<input[^>]*>/)?.[0] ?? "";
    expect(input).toContain('id="newPerDay"');
    expect(input).toContain('value="7"');
    expect(input).toContain('aria-describedby="newPerDay-hint"');
  });

  it("Verwaltung: drei Zeilen aus dem Zeilenaufbau der Nutzerliste, ohne Adressen, als ladend markiert", () => {
    const html = renderToStaticMarkup(createElement(UserListSkeleton));
    expect(html).toMatch(/^<div aria-busy="true"/);
    const rows = skeletonTags(html);
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      const classes = classesOf(row);
      for (const cls of USER_ROW.split(" ")) expect(classes).toContain(cls);
      // Der Mustertext gibt nur die Höhe vor und bleibt unsichtbar.
      expect(classes).toContain("*:invisible");
    }
    expect(html).not.toContain("@");
  });
});
