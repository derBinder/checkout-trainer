"use client";

import { useEffect, useRef } from "react";

/**
 * Überschrift am Ende einer Lernsitzung oder Übungsrunde. Der zuletzt gedrückte
 * Knopf ist dann verschwunden: Die Überschrift nimmt den Fokus, damit Tastatur
 * und Screenreader beim Ergebnis weitermachen statt am Seitenanfang.
 */
export function EndHeading({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1} className="type-display text-hero outline-none">
      {children}
    </h1>
  );
}
