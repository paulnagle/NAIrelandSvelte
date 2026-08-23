import type { Meeting, MeetingKind } from './types.ts';

/**
 * Classifies a meeting's attendance mode by examining the `formats`
 * field for the key strings VM (virtual), HY (hybrid), and TC (temp-closed).
 *
 * Ported from `getMeetingType()` in
 * `NA-Ireland-Ionic-6/src/app/components/meeting-card/meeting-card.component.ts`.
 *
 * Logic:
 *   - formats empty OR no VM/TC/HY present → 'inperson'
 *   - VM only (no TC, no HY)               → 'virtual'
 *   - VM + TC (no HY)                      → 'tempreplace'
 *   - HY (with or without VM, no TC)        → 'hybrid'
 *   - TC only (no VM, no HY)               → 'tempclosed'
 */
export function getMeetingKind(meeting: Pick<Meeting, 'formats'>): MeetingKind {
  const f = meeting.formats;

  if (f === '') return 'inperson';

  // Split on commas and match whole tokens so a future code like "NOVM" does not
  // accidentally set hasVM = true via substring search.
  const codes = new Set(f.split(',').map((s) => s.trim()));
  const hasVM = codes.has('VM');
  const hasTC = codes.has('TC');
  const hasHY = codes.has('HY');

  if (!hasVM && !hasTC && !hasHY) return 'inperson';
  if (hasVM && !hasTC && !hasHY) return 'virtual';
  if (hasVM && hasTC && !hasHY) return 'tempreplace';
  if (hasHY && !hasTC) return 'hybrid'; // VM+HY or HY alone
  if (!hasVM && hasTC && !hasHY) return 'tempclosed';

  // Catch-all: treat anything unclassified as in-person (matches original "" return treated as INPERSON by the template).
  return 'inperson';
}
