import { describe, it, expect } from 'vitest';
import { buildSharePayload } from '$lib/meetings/share';
import type { Meeting } from '$lib/meetings/types';

function baseMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id_bigint: '1',
    meeting_name: 'Test Meeting',
    weekday_tinyint: '2',
    start_time: '20:00:00',
    duration_time: '01:00:00',
    time_zone: '',
    venue_type: '1',
    location_text: 'The Hall',
    location_info: '',
    location_street: '1 Main St',
    location_neighborhood: '',
    location_city_subsection: '',
    location_municipality: 'Dublin',
    location_sub_province: 'County Dublin',
    location_province: '',
    location_postal_code_1: 'D01 AA00',
    latitude: '53.3498',
    longitude: '-6.2603',
    format_shared_id_list: '1,2',
    formats: 'O,BT',
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
    root_server_uri: '',
    ...overrides
  };
}

describe('buildSharePayload', () => {
  it('sets title to the meeting name', () => {
    const { title } = buildSharePayload(baseMeeting(), 'Monday', '24hr');
    expect(title).toBe('Test Meeting');
  });

  it('includes meeting name, day, start and end time in text', () => {
    const { text } = buildSharePayload(baseMeeting(), 'Monday', '24hr');
    expect(text).toContain('Test Meeting');
    expect(text).toContain('Monday');
    expect(text).toContain('20:00');
    expect(text).toContain('21:00');
  });

  it('includes address fields that are present', () => {
    const { text } = buildSharePayload(baseMeeting(), 'Monday', '24hr');
    expect(text).toContain('The Hall');
    expect(text).toContain('1 Main St');
    expect(text).toContain('Dublin');
    expect(text).toContain('County Dublin');
    expect(text).toContain('D01 AA00');
  });

  it('uses Google Maps URL as url when no virtual link', () => {
    const { url } = buildSharePayload(baseMeeting(), 'Monday', '24hr');
    expect(url).toContain('google.com/maps');
    expect(url).toContain('53.3498');
    expect(url).toContain('-6.2603');
  });

  it('uses virtual_meeting_link as url when present', () => {
    const meeting = baseMeeting({ virtual_meeting_link: 'https://zoom.us/j/123' });
    const { url } = buildSharePayload(meeting, 'Monday', '24hr');
    expect(url).toBe('https://zoom.us/j/123');
  });

  it('appends the url to the text', () => {
    const meeting = baseMeeting({ virtual_meeting_link: 'https://zoom.us/j/123' });
    const { text } = buildSharePayload(meeting, 'Monday', '24hr');
    expect(text).toContain('url: https://zoom.us/j/123');
  });

  it('formats times in 12hr mode', () => {
    const { text } = buildSharePayload(baseMeeting(), 'Monday', '12hr');
    expect(text).toContain('8:00 pm');
    expect(text).toContain('9:00 pm');
  });

  it('includes only present address fields in the share text', () => {
    const meeting = baseMeeting({
      location_text: '',
      location_street: '',
      location_neighborhood: '',
      location_city_subsection: '',
      location_sub_province: '',
      location_province: '',
      location_postal_code_1: '',
      location_municipality: 'Cork'
    });
    const { text } = buildSharePayload(meeting, 'Monday', '24hr');
    expect(text).toContain('Cork');
    // Fields after a missing location_text get " , " prepended — this matches
    // the original shareMeeting() logic exactly (ported faithfully).
    expect(text).not.toContain('Dublin'); // other municipality not present
    expect(text).not.toContain('County Dublin'); // sub_province not present
  });

  it('includes phone_meeting_number when present', () => {
    const meeting = baseMeeting({ phone_meeting_number: '+353-1-234-5678' });
    const { text } = buildSharePayload(meeting, 'Monday', '24hr');
    expect(text).toContain('+353-1-234-5678');
  });
});
