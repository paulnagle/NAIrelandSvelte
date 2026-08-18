import { describe, it, expect } from 'vitest';
import { groupByWeekday, filterByDay, filterByHourRange, sortMeetings } from '$lib/meetings/list';
import type { Meeting } from '$lib/meetings/types';

// Factory — only the fields list.ts needs
function m(weekday: string, start_time: string, id = 'id'): Meeting {
  return {
    id_bigint: id,
    meeting_name: 'Test',
    weekday_tinyint: weekday,
    start_time,
    duration_time: '01:00:00',
    time_zone: '',
    venue_type: '1',
    location_text: '',
    location_info: '',
    location_street: '',
    location_neighborhood: '',
    location_city_subsection: '',
    location_municipality: '',
    location_sub_province: '',
    location_province: '',
    location_postal_code_1: '',
    latitude: '53.0',
    longitude: '-8.0',
    format_shared_id_list: '',
    formats: '',
    comments: '',
    virtual_meeting_link: '',
    phone_meeting_number: '',
    virtual_meeting_additional_info: '',
    contact_phone_1: '',
    contact_email_1: '',
    bus_lines: '',
    train_lines: '',
    service_body_bigint: '',
    worldid_mixed: '',
    root_server_uri: ''
  };
}

describe('groupByWeekday', () => {
  it('groups meetings into correct weekday buckets', () => {
    const meetings = [m('2', '09:00:00'), m('2', '20:00:00'), m('5', '18:30:00')];
    const groups = groupByWeekday(meetings);
    expect(groups).toHaveLength(2);
    expect(groups[0].weekday).toBe(2);
    expect(groups[0].meetings).toHaveLength(2);
    expect(groups[1].weekday).toBe(5);
    expect(groups[1].meetings).toHaveLength(1);
  });

  it('sorts groups by weekday', () => {
    const meetings = [m('5', '10:00:00'), m('1', '09:00:00'), m('3', '18:00:00')];
    const groups = groupByWeekday(meetings);
    expect(groups.map((g) => g.weekday)).toEqual([1, 3, 5]);
  });

  it('sorts meetings within each day by start_time', () => {
    const meetings = [m('2', '20:00:00', 'b'), m('2', '09:00:00', 'a')];
    const groups = groupByWeekday(meetings);
    expect(groups[0].meetings[0].id_bigint).toBe('a');
    expect(groups[0].meetings[1].id_bigint).toBe('b');
  });

  it('returns empty array for empty input', () => {
    expect(groupByWeekday([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const meetings = [m('3', '10:00:00'), m('2', '09:00:00')];
    const original = [...meetings];
    groupByWeekday(meetings);
    expect(meetings).toEqual(original);
  });
});

describe('filterByDay', () => {
  const meetings = [m('1', '09:00:00'), m('2', '10:00:00'), m('2', '20:00:00'), m('5', '18:30:00')];

  it('returns only meetings for the specified weekday', () => {
    expect(filterByDay(meetings, 2)).toHaveLength(2);
  });

  it('returns all meetings when weekday is null', () => {
    expect(filterByDay(meetings, null)).toHaveLength(4);
  });

  it('returns empty array when no meetings on that day', () => {
    expect(filterByDay(meetings, 7)).toHaveLength(0);
  });
});

describe('filterByHourRange', () => {
  const meetings = [m('1', '08:00:00', 'm1'), m('2', '12:30:00', 'm2'), m('3', '18:00:00', 'm3'), m('4', '23:00:00', 'm4')];

  it('includes meetings where start hour is within [lower, upper]', () => {
    const result = filterByHourRange(meetings, 8, 18);
    expect(result.map((x) => x.id_bigint)).toEqual(['m1', 'm2', 'm3']);
  });

  it('excludes meetings outside the range', () => {
    // m2 starts at 12:30 (hour=12, within [9,17])
    // m3 starts at 18:00 (hour=18, outside [9,17])
    const result = filterByHourRange(meetings, 9, 17);
    expect(result.map((x) => x.id_bigint)).toEqual(['m2']);
  });

  it('returns all meetings when range is 0–23', () => {
    expect(filterByHourRange(meetings, 0, 23)).toHaveLength(4);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterByHourRange(meetings, 2, 3)).toHaveLength(0);
  });
});

describe('sortMeetings', () => {
  it('sorts by weekday first then start_time', () => {
    const meetings = [m('3', '10:00:00', 'c'), m('1', '20:00:00', 'b'), m('1', '09:00:00', 'a')];
    const sorted = sortMeetings(meetings);
    expect(sorted.map((x) => x.id_bigint)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const meetings = [m('3', '10:00:00'), m('1', '09:00:00')];
    const original = [...meetings];
    sortMeetings(meetings);
    expect(meetings).toEqual(original);
  });
});
