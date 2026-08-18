import type { Meeting, MeetingGroup } from '$lib/meetings/types';

/**
 * Groups a flat meeting array into 7 weekday buckets, sorted by start_time
 * within each day.  Only weekdays that have at least one meeting are included.
 * The result is sorted by weekday (1=Sunday … 7=Saturday).
 */
export function groupByWeekday(meetings: Meeting[]): MeetingGroup[] {
  const buckets = new Map<number, Meeting[]>();

  for (const meeting of meetings) {
    const day = parseInt(meeting.weekday_tinyint, 10);
    if (!buckets.has(day)) buckets.set(day, []);
    buckets.get(day)!.push(meeting);
  }

  const groups: MeetingGroup[] = [];
  for (const [weekday, dayMeetings] of buckets) {
    groups.push({
      weekday,
      meetings: [...dayMeetings].sort((a, b) => a.start_time.localeCompare(b.start_time))
    });
  }

  groups.sort((a, b) => a.weekday - b.weekday);
  return groups;
}

/**
 * Filters meetings to those on a specific weekday (1–7).
 * Pass `null` to return all meetings unfiltered.
 */
export function filterByDay(meetings: Meeting[], weekday: number | null): Meeting[] {
  if (weekday === null) return meetings;
  return meetings.filter((m) => parseInt(m.weekday_tinyint, 10) === weekday);
}

/**
 * Filters meetings whose start hour (0–23) falls within [lower, upper] inclusive.
 * `lower` and `upper` are hours (0–23), not minutes.
 */
export function filterByHourRange(meetings: Meeting[], lower: number, upper: number): Meeting[] {
  return meetings.filter((m) => {
    const hour = parseInt(m.start_time.split(':')[0] ?? '0', 10);
    return hour >= lower && hour <= upper;
  });
}

/**
 * Sorts a flat meeting array: first by weekday_tinyint, then by start_time.
 * Returns a new array; does not mutate the input.
 */
export function sortMeetings(meetings: Meeting[]): Meeting[] {
  return [...meetings].sort((a, b) => {
    const dayDiff = a.weekday_tinyint.localeCompare(b.weekday_tinyint);
    if (dayDiff !== 0) return dayDiff;
    return a.start_time.localeCompare(b.start_time);
  });
}
