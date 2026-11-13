import { useEffect } from "react";

/** Fehler beim Freigeben sind egal: Die Sperre ist dann ohnehin weg. */
function release(sentinel: WakeLockSentinel | null) {
  sentinel?.release().catch(() => {});
}

/**
 * Hält den Bildschirm an, solange `active` gilt (Screen Wake Lock API).
 * Verbirgt sich die Seite, gibt der Browser die Sperre selbst frei; bei der
 * Rückkehr wird sie neu angefordert. Ohne API oder bei Ablehnung passiert
 * nichts, auch keine Meldung. Die Freigabe läuft über den Effekt-Abbau, also
 * auch, wenn React die Komponente per Activity verbirgt.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    const { wakeLock } = navigator;
    let sentinel: WakeLockSentinel | null = null;
    let pending = false;
    let stopped = false;

    const request = () => {
      if (pending || document.visibilityState !== "visible") return;
      if (sentinel && !sentinel.released) return;
      pending = true;
      wakeLock.request("screen").then(
        (granted) => {
          pending = false;
          if (stopped) release(granted);
          else sentinel = granted;
        },
        () => {
          pending = false;
        },
      );
    };

    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", request);
      release(sentinel);
    };
  }, [active]);
}
