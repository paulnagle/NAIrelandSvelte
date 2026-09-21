import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn()
  }
}));

vi.mock('$lib/platform.js', () => ({
  isNative: vi.fn()
}));

vi.mock('$lib/stores/settings.svelte.js', () => ({
  settings: {
    directionsApp: 'google-maps-web' as import('$lib/stores/settings.svelte.js').DirectionsApp
  }
}));

import { Browser } from '@capacitor/browser';
import type { Meeting } from '$lib/meetings/types';
import { openMeetingDirections, testing } from '$lib/maps/directions';
import { isNative } from '$lib/platform.js';
import { settings } from '$lib/stores/settings.svelte.js';
import type { DirectionsApp } from '$lib/stores/settings.svelte.js';

const mockOpen = vi.mocked(Browser.open);
const mockIsNative = vi.mocked(isNative);
const mockSettings = settings as { directionsApp: DirectionsApp };

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

// jsdom provides window.location but assignment to href is a no-op; we spy on it.
const locationSpy = vi.spyOn(window, 'location', 'get');
const mockLocation = { href: '' };

beforeEach(() => {
  vi.clearAllMocks();
  mockSettings.directionsApp = 'google-maps-web';
  mockIsNative.mockReturnValue(false);
  mockLocation.href = '';
  locationSpy.mockReturnValue(mockLocation as unknown as Location);
});

describe('openMeetingDirections — web (isNative=false)', () => {
  it('opens Google Maps web via Browser.open', async () => {
    mockSettings.directionsApp = 'google-maps-web';

    await openMeetingDirections(baseMeeting());

    expect(mockOpen).toHaveBeenCalledWith({ url: testing.googleMapsWebUrl(baseMeeting()) });
    expect(mockLocation.href).toBe('');
  });

  it('opens Google Maps app URL via Browser.open on web', async () => {
    mockSettings.directionsApp = 'google-maps-app';

    await openMeetingDirections(baseMeeting());

    expect(mockOpen).toHaveBeenCalledWith({ url: testing.googleMapsAppUrl(baseMeeting()) });
    expect(mockLocation.href).toBe('');
  });

  it('opens Apple Maps web URL via Browser.open on web', async () => {
    mockSettings.directionsApp = 'apple-maps-web';

    await openMeetingDirections(baseMeeting());

    expect(mockOpen).toHaveBeenCalledWith({ url: testing.appleMapsWebUrl(baseMeeting()) });
    expect(mockLocation.href).toBe('');
  });

  it('opens Apple Maps app URL via OS on web (deep-link always uses OS)', async () => {
    mockSettings.directionsApp = 'apple-maps-app';

    await openMeetingDirections(baseMeeting());

    expect(mockOpen).not.toHaveBeenCalled();
    expect(mockLocation.href).toBe(testing.appleMapsAppUrl(baseMeeting()));
  });
});

describe('openMeetingDirections — native (isNative=true)', () => {
  beforeEach(() => {
    mockIsNative.mockReturnValue(true);
  });

  it('opens Google Maps web via Browser.open on native', async () => {
    mockSettings.directionsApp = 'google-maps-web';

    await openMeetingDirections(baseMeeting());

    expect(mockOpen).toHaveBeenCalledWith({ url: testing.googleMapsWebUrl(baseMeeting()) });
    expect(mockLocation.href).toBe('');
  });

  it('dispatches Google Maps app URL via OS on native', async () => {
    mockSettings.directionsApp = 'google-maps-app';

    await openMeetingDirections(baseMeeting());

    expect(mockOpen).not.toHaveBeenCalled();
    expect(mockLocation.href).toBe(testing.googleMapsAppUrl(baseMeeting()));
  });

  it('dispatches Apple Maps app URL via OS when apple-maps-web set on native', async () => {
    // apple-maps-web on native routes to the app URL because iOS always opens
    // maps.apple.com in the Maps app regardless of http vs https scheme.
    mockSettings.directionsApp = 'apple-maps-web';

    await openMeetingDirections(baseMeeting());

    expect(mockOpen).not.toHaveBeenCalled();
    expect(mockLocation.href).toBe(testing.appleMapsAppUrl(baseMeeting()));
  });

  it('dispatches Apple Maps app URL via OS on native', async () => {
    mockSettings.directionsApp = 'apple-maps-app';

    await openMeetingDirections(baseMeeting());

    expect(mockOpen).not.toHaveBeenCalled();
    expect(mockLocation.href).toBe(testing.appleMapsAppUrl(baseMeeting()));
  });
});

describe('meeting directions URLs', () => {
  it('google-maps-web URL encodes coordinates', () => {
    const meeting = baseMeeting();
    expect(testing.googleMapsWebUrl(meeting)).toContain(encodeURIComponent('53.3498,-6.2603'));
  });

  it('google-maps-app URL is a universal link with encoded query', () => {
    const meeting = baseMeeting();
    const url = testing.googleMapsAppUrl(meeting);
    expect(url).toMatch(/^https:\/\/maps\.google\.com\/maps/);
    expect(url).toContain(encodeURIComponent('53.3498,-6.2603 (Test Meeting, The Hall, 1 Main St, Dublin)'));
  });

  it('apple-maps-web URL uses https scheme and includes label', () => {
    const meeting = baseMeeting();
    const url = testing.appleMapsWebUrl(meeting);
    expect(url).toMatch(/^https:\/\/maps\.apple\.com/);
    expect(url).toContain(encodeURIComponent('53.3498,-6.2603 (Test Meeting, The Hall, 1 Main St, Dublin)'));
  });

  it('apple-maps-app URL uses http scheme and includes label', () => {
    const meeting = baseMeeting();
    const url = testing.appleMapsAppUrl(meeting);
    expect(url).toMatch(/^http:\/\/maps\.apple\.com/);
    expect(url).toContain(encodeURIComponent('53.3498,-6.2603 (Test Meeting, The Hall, 1 Main St, Dublin)'));
  });
});
