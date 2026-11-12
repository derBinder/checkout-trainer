import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatsOverviewSkeleton } from "@/components/stats/stats-skeleton";
import { StreakChipSkeleton } from "@/components/streak-chip";
import { TodayOverviewSkeleton } from "@/components/today/today-skeleton";
import { buttonShape, buttonVariants } from "@/components/ui/button";

const SKELETONS: [string, () => ReactElement][] = [
  ["Heute", () => createElement(TodayOverviewSkeleton)],
  ["Statistik", () => createElement(StatsOverviewSkeleton)],
  ["Serien-Schildchen", () => createElement(StreakChipSkeleton)],
];

function classesOf(tag: string): string[] {
  return (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/).filter(Boolean);
}

function skeletonTags(html: string): string[] {
  return html.match(/<[a-z]+[^>]*data-slot="skeleton"[^>]*>/g) ?? [];
}

/** Blockelemente (div, p, dl, ol …) innerhalb eines span sind kein gültiges HTML. */
function blockInsideSpan(html: string): string | null {
  const stack: string[] = [];
  for (const [, closing, name] of html.matchAll(/<(\/?)([a-z0-9]+)[^>]*?>/g)) {
    if (closing) {
      stack.splice(stack.lastIndexOf(name), 1);
      continue;
    }
    if (["div", "p", "dl", "ol", "ul", "section"].includes(name) && stack.includes("span")) return name;
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

  it.each(SKELETONS)("%s: keine Blockelemente in span", (_, render) => {
    expect(blockInsideSpan(renderToStaticMarkup(render()))).toBeNull();
  });

  it("Statistik: das neutrale Raster ist für Screenreader versteckt", () => {
    const html = renderToStaticMarkup(createElement(StatsOverviewSkeleton));
    const grid = html.match(/<ol[^>]*>/)?.[0] ?? "";
    expect(grid).toContain('aria-hidden="true"');
  });
});
