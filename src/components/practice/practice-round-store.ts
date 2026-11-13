"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Ob gerade eine Übungsrunde läuft. Die Navigation sitzt im Layout und erfährt es
 * hierüber; eine Runde hat wie die Lernsitzung nur eine Aufgabe und keine Navigation.
 * Die Runde meldet sich in einem Effekt an: Wird sie ausgehängt oder von Activity
 * verborgen (Seitenwechsel), meldet sie sich wieder ab.
 */
let active = false;
const listeners = new Set<() => void>();

function setActive(value: boolean) {
  if (active === value) return;
  active = value;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRoundActive(): boolean {
  return useSyncExternalStore(subscribe, () => active, () => false);
}

export function useMarkRoundActive(isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;
    setActive(true);
    return () => setActive(false);
  }, [isActive]);
}
