import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn()
  }
}));

vi.mock('$lib/platform.js', () => ({
  isAndroid: vi.fn(),
  isIOS: vi.fn()
}));

import { Browser } from '@capacitor/browser';
import type { Meeting } from '$lib/meetings/types';
import { openMeetingDirections, testing } from '$lib/maps/directions';
import { isAndroid, isIOS } from '$lib/platform.js';

const mockOpen = vi.mocked(Browser.open);
const mockIsAndroid = vi.mocked(isAndroid);
const mockIsIOS = vi.mocked(isIOS);

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

beforeEach(() => {
  vi.clearAllMocks();
  mockIsIOS.mockReturnValue(false);
  mockIsAndroid.mockReturnValue(false);
});

describe('openMeetingDirections', () => {
  it('opens Apple Maps on iOS', async () => {
    mockIsIOS.mockReturnValue(true);

    await openMeetingDirections(baseMeeting());

    expect(mockOpen).toHaveBeenCalledWith({ url: testing.appleMapsUrl(baseMeeting()) });
  });

  it('falls back to Google Maps web on iOS when Apple Maps open fails', async () => {
    const meeting = baseMeeting();
    mockIsIOS.mockReturnValue(true);
    mockOpen.mockRejectedValueOnce(new Error('open failed')).mockResolvedValueOnce(undefined);

    await openMeetingDirections(meeting);

    expect(mockOpen).toHaveBeenNthCalledWith(1, { url: testing.appleMapsUrl(meeting) });
    expect(mockOpen).toHaveBeenNthCalledWith(2, { url: testing.googleMapsWebUrl(meeting) });
  });

  it('opens the Google Maps app on Android', async () => {
    mockIsAndroid.mockReturnValue(true);

    await openMeetingDirections(baseMeeting());

    expect(mockOpen).toHaveBeenCalledWith({ url: testing.googleMapsAppUrl(baseMeeting()) });
  });

  it('falls back to Google Maps web on Android when the app URL fails', async () => {
    const meeting = baseMeeting();
    mockIsAndroid.mockReturnValue(true);
    mockOpen.mockRejectedValueOnce(new Error('open failed')).mockResolvedValueOnce(undefined);

    await openMeetingDirections(meeting);

    expect(mockOpen).toHaveBeenNthCalledWith(1, { url: testing.googleMapsAppUrl(meeting) });
    expect(mockOpen).toHaveBeenNthCalledWith(2, { url: testing.googleMapsWebUrl(meeting) });
  });

  it('uses Google Maps web outside native platforms', async () => {
    const meeting = baseMeeting();

    await openMeetingDirections(meeting);

    expect(mockOpen).toHaveBeenCalledWith({ url: testing.googleMapsWebUrl(meeting) });
  });
});

describe('meeting directions URLs', () => {
  it('includes the meeting label where supported', () => {
    const meeting = baseMeeting();

    expect(testing.appleMapsUrl(meeting)).toContain(encodeURIComponent('53.3498,-6.2603 (Test Meeting, The Hall, 1 Main St, Dublin)'));
    expect(testing.googleMapsAppUrl(meeting)).toContain(encodeURIComponent('53.3498,-6.2603 (Test Meeting, The Hall, 1 Main St, Dublin)'));
  });
});