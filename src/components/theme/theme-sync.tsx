"use client";

import { useLayoutEffect } from "react";
import { applyThemeSetting, readThemeSetting, subscribeThemeSetting } from "./theme-store";

/**
 * Das Inline-Skript im <head> setzt die Darstellung vor dem ersten Zeichnen.
 * Diese Komponente setzt sie nach dem Hydrieren erneut (React entfernt in der
 * Entwicklung fremde Attribute an <html>) und übernimmt Wechsel aus anderen Tabs.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    const apply = () => applyThemeSetting(readThemeSetting());
    apply();
    return subscribeThemeSetting(apply);
  }, []);
  return null;
}
