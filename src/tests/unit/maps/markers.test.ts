import { describe, it, expect } from 'vitest';
import { buildMarkers, iconFor, SINGLE_ICON, SHARED_ICON } from '$lib/maps/markers';
import type { Meeting } from '$lib/meetings/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function m(id: string, lat: string, lng: string): Meeting {
  return {
    id_bigint: id,
    meeting_name: 'Test',
    weekday_tinyint: '2',
    start_time: '20:00:00',
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
    latitude: lat,
    longitude: lng,
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

// ---------------------------------------------------------------------------
// buildMarkers
// ---------------------------------------------------------------------------

describe('buildMarkers', () => {
  it('returns an empty array for no meetings', () => {
    expect(buildMarkers([])).toEqual([]);
  });

  it('creates one marker per distinct location', () => {
    const meetings = [m('1', '53.349', '-6.260'), m('2', '51.898', '-8.475')];
    const markers = buildMarkers(meetings);
    expect(markers).toHaveLength(2);
  });

  it('collapses co-located meetings (same 3-decimal coordinate) into one marker', () => {
    // Slightly different raw values that round to the same 3-decimal key
    const meetings = [
      m('1', '53.3490', '-6.2603'),
      m('2', '53.3491', '-6.2604'),
      m('3', '53.3498', '-6.2600') // rounds differently
    ];
    const markers = buildMarkers(meetings);
    // '53.349,-6.260' appears twice → collapsed into one marker with 2 ids
    // '53.350,-6.260' appears once  → single marker
    expect(markers).toHaveLength(2);
    const shared = markers.find((mk) => mk.ids.length === 2);
    expect(shared).toBeDefined();
    expect(shared!.ids).toContain('1');
    expect(shared!.ids).toContain('2');
  });

  it('fixes the Ionic off-by-one: the last co-located group is not dropped', () => {
    // All three meetings share the same rounded coordinate.
    // The original Ionic algorithm walked the array with a mutable index and
    // read one past the end on the last group, silently dropping it.
    // Order-independent Map grouping has no boundary case.
    const meetings = [m('10', '53.000', '-8.000'), m('11', '53.000', '-8.000'), m('12', '53.000', '-8.000')];
    const markers = buildMarkers(meetings);
    expect(markers).toHaveLength(1);
    expect(markers[0].ids).toHaveLength(3);
    expect(markers[0].ids).toContain('12'); // would have been dropped by the original
  });

  it('skips meetings with invalid coordinates', () => {
    const meetings = [m('1', 'not-a-number', '-6.260'), m('2', '', ''), m('3', '53.349', '-6.260')];
    const markers = buildMarkers(meetings);
    expect(markers).toHaveLength(1);
    expect(markers[0].ids).toEqual(['3']);
  });

  it('skips meetings with a missing id_bigint', () => {
    const meetings = [m('', '53.349', '-6.260')];
    expect(buildMarkers(meetings)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// iconFor
// ---------------------------------------------------------------------------

describe('iconFor', () => {
  it('returns SINGLE_ICON for a marker with one meeting', () => {
    expect(iconFor({ coordinate: { lat: 53, lng: -6 }, ids: ['1'] })).toBe(SINGLE_ICON);
  });

  it('returns SHARED_ICON for a marker with multiple meetings', () => {
    expect(iconFor({ coordinate: { lat: 53, lng: -6 }, ids: ['1', '2'] })).toBe(SHARED_ICON);
  });
});
