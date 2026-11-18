/** Eine Ladung der Sitzung vom Server: Kennung und Karten. */
export type StudyLoad<T> = { loadId: string; items: T; doneToday?: number };

/**
 * Welche Ladung die Sitzung zeigt. Ohne React, damit testbar.
 *
 * - Läuft schon eine Sitzung, bleibt sie, auch wenn der Server die Seite neu
 *   rendert (etwa nach einer Server Action, die das Sitzungs-Cookie erneuert).
 * - Sonst startet sie mit der ankommenden Ladung, außer mit dieser lief schon
 *   eine Sitzung (`used`): Dann stammt sie aus dem Zurück-Cache des Browsers,
 *   ihre Karten sind womöglich schon anders gespeichert, und es braucht eine
 *   frische Ladung (null).
 */
export function nextLoad<T>(
  active: StudyLoad<T> | null,
  incoming: StudyLoad<T>,
  used: ReadonlySet<string>,
): StudyLoad<T> | null {
  if (active) return active;
  return used.has(incoming.loadId) ? null : incoming;
}

/**
 * Welche Ladungen nach dem Anzeigen als verbraucht gelten: die, mit der die
 * Sitzung läuft, und jede, die währenddessen ankommt (etwa nach einer Server
 * Action). Sonst könnte später eine solche Ladung aus dem Zurück-Cache eine
 * Sitzung mit Karten starten, die inzwischen schon bewertet sind.
 */
export function loadsToRecord<T>(active: StudyLoad<T> | null, incoming: StudyLoad<T>): string[] {
  if (!active) return [];
  return active.loadId === incoming.loadId ? [active.loadId] : [active.loadId, incoming.loadId];
}

/** So lange nach dem Anfordern frischer Karten erscheint statt des Skeletons ein Hinweis. */
export const REFRESH_TIMEOUT_MS = 5000;
