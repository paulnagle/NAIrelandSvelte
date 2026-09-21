import { Browser } from '@capacitor/browser';

import type { Meeting } from '$lib/meetings/types.js';
import { isNative } from '$lib/platform.js';
import { settings } from '$lib/stores/settings.svelte.js';

function meetingLabel(meeting: Meeting): string {
  return [meeting.meeting_name, meeting.location_text, meeting.location_street, meeting.location_municipality].filter(Boolean).join(', ');
}

function googleMapsWebUrl(meeting: Meeting): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${meeting.latitude},${meeting.longitude}`)}`;
}

function appleMapsWebUrl(meeting: Meeting): string {
  const label = meetingLabel(meeting);
  const q = label ? `${meeting.latitude},${meeting.longitude} (${label})` : `${meeting.latitude},${meeting.longitude}`;
  return `https://maps.apple.com/?ll=${encodeURIComponent(`${meeting.latitude},${meeting.longitude}`)}&q=${encodeURIComponent(q)}`;
}

function appleMapsAppUrl(meeting: Meeting): string {
  const label = meetingLabel(meeting);
  const query = label ? `${meeting.latitude},${meeting.longitude} (${label})` : `${meeting.latitude},${meeting.longitude}`;
  return `http://maps.apple.com/?ll=${encodeURIComponent(`${meeting.latitude},${meeting.longitude}`)}&q=${encodeURIComponent(query)}`;
}

function googleMapsAppUrl(meeting: Meeting): string {
  // Universal link — on native, iOS/Android dispatch this to the Google Maps app
  // when installed. On web it opens in the browser as a normal maps search.
  const label = meetingLabel(meeting);
  const query = label ? `${meeting.latitude},${meeting.longitude} (${label})` : `${meeting.latitude},${meeting.longitude}`;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}`;
}

/**
 * Open a URL via the OS URL dispatcher so the OS can route it to a native app
 * (deep-link / universal link). Browser.open() always opens an in-app WebView
 * and never reaches the OS dispatcher, so it cannot launch native apps.
 */
function openViaOS(url: string): void {
  window.location.href = url;
}

export async function openMeetingDirections(meeting: Meeting): Promise<void> {
  switch (settings.directionsApp) {
    case 'google-maps-app':
      // On native, let the OS dispatch the universal link to the Google Maps app.
      // On web, open in the in-app browser as a regular maps page.
      if (isNative()) {
        openViaOS(googleMapsAppUrl(meeting));
      } else {
        await Browser.open({ url: googleMapsAppUrl(meeting) });
      }
      break;

    case 'apple-maps-web':
      // https://maps.apple.com is an Apple universal link; on iOS the OS opens
      // it in Apple Maps. On web it opens as a webpage in the browser.
      if (isNative()) {
        openViaOS(appleMapsWebUrl(meeting));
      } else {
        await Browser.open({ url: appleMapsWebUrl(meeting) });
      }
      break;

    case 'apple-maps-app':
      // http://maps.apple.com is a deep-link scheme; must go via OS dispatcher
      // so iOS routes it to the Maps app rather than opening a WebView.
      openViaOS(appleMapsAppUrl(meeting));
      break;

    case 'google-maps-web':
    default:
      await Browser.open({ url: googleMapsWebUrl(meeting) });
      break;
  }
}

export const testing = {
  appleMapsAppUrl,
  appleMapsWebUrl,
  googleMapsAppUrl,
  googleMapsWebUrl,
  meetingLabel
};
