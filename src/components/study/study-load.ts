/** Eine Ladung der Sitzung vom Server: Kennung und Karten. */
export type StudyLoad<T> = { loadId: string; items: T };

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
