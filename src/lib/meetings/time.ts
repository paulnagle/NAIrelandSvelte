import type { Meeting } from '$lib/meetings/types';

/**
 * Parses a BMLT time string "HH:MM:SS" (or "HH:MM") into total minutes.
 * Returns 0 for empty or malformed input.
 */
export function parseMinutes(time: string): number {
  if (!time) return 0;
  const parts = time.split(':');
  const hours = parseInt(parts[0] ?? '0', 10);
  const minutes = parseInt(parts[1] ?? '0', 10);
  return hours * 60 + minutes;
}

/**
 * Formats total minutes (0–1439+) back to a display time string.
 *
 * - '24hr': "HH:MM"
 * - '12hr': "h:MM am/pm" (e.g. "7:30 am", "12:00 pm", "12:00 am" for midnight)
 */
export function formatTime(totalMinutes: number, display: '12hr' | '24hr'): string {
  // Wrap at 24 hours so e.g. 1440 → 0 (midnight next day)
  const wrapped = totalMinutes % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const mm = String(m).padStart(2, '0');

  if (display === '24hr') {
    const hh = String(h).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // 12-hour clock — h is always 0–23 after the % wrap above, so h < 12 suffices
  const ampm = h < 12 ? 'am' : 'pm';
  const hour12 = h % 12 || 12; // 0 → 12 (midnight), 12 → 12 (noon)
  return `${hour12}:${mm} ${ampm}`;
}

/**
 * Returns the formatted start time for a meeting.
 */
export function getStartTimeDisplay(meeting: Pick<Meeting, 'start_time'>, display: '12hr' | '24hr'): string {
  return formatTime(parseMinutes(meeting.start_time), display);
}

/**
 * Calculates and returns the formatted end time for a meeting
 * (start_time + duration_time).
 */
export function getEndTime(meeting: Pick<Meeting, 'start_time' | 'duration_time'>, display: '12hr' | '24hr'): string {
  const startMins = parseMinutes(meeting.start_time);
  const durationMins = parseMinutes(meeting.duration_time);
  return formatTime(startMins + durationMins, display);
}
