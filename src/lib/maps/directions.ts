import { Browser } from '@capacitor/browser';

import type { Meeting } from '$lib/meetings/types.js';
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
  // Universal link — Google Maps intercepts this when installed; falls back to
  // the browser when not. Avoids the comgooglemaps:// custom scheme which opens
  // a blank page when the app isn't present.
  const label = meetingLabel(meeting);
  const query = label ? `${meeting.latitude},${meeting.longitude} (${label})` : `${meeting.latitude},${meeting.longitude}`;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}`;
}

export async function openMeetingDirections(meeting: Meeting): Promise<void> {
  switch (settings.directionsApp) {
    case 'google-maps-app':
      await Browser.open({ url: googleMapsAppUrl(meeting) });
      break;

    case 'apple-maps-web':
      await Browser.open({ url: appleMapsWebUrl(meeting) });
      break;

    case 'apple-maps-app':
      await Browser.open({ url: appleMapsAppUrl(meeting) });
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
