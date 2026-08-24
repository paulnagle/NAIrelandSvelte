import { Browser } from '@capacitor/browser';

import type { Meeting } from '$lib/meetings/types.js';
import { isAndroid, isIOS } from '$lib/platform.js';

function meetingLabel(meeting: Meeting): string {
  return [meeting.meeting_name, meeting.location_text, meeting.location_street, meeting.location_municipality].filter(Boolean).join(', ');
}

function googleMapsWebUrl(meeting: Meeting): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${meeting.latitude},${meeting.longitude}`)}`;
}

function appleMapsUrl(meeting: Meeting): string {
  const label = meetingLabel(meeting);
  const query = label ? `${meeting.latitude},${meeting.longitude} (${label})` : `${meeting.latitude},${meeting.longitude}`;
  return `http://maps.apple.com/?ll=${encodeURIComponent(`${meeting.latitude},${meeting.longitude}`)}&q=${encodeURIComponent(query)}`;
}

function googleMapsAppUrl(meeting: Meeting): string {
  const label = meetingLabel(meeting);
  const query = label ? `${meeting.latitude},${meeting.longitude} (${label})` : `${meeting.latitude},${meeting.longitude}`;
  return `comgooglemaps://?q=${encodeURIComponent(query)}&center=${encodeURIComponent(`${meeting.latitude},${meeting.longitude}`)}`;
}

export async function openMeetingDirections(meeting: Meeting): Promise<void> {
  const fallbackUrl = googleMapsWebUrl(meeting);

  if (isIOS()) {
    try {
      await Browser.open({ url: appleMapsUrl(meeting) });
      return;
    } catch {
      await Browser.open({ url: fallbackUrl });
      return;
    }
  }

  if (isAndroid()) {
    try {
      await Browser.open({ url: googleMapsAppUrl(meeting) });
      return;
    } catch {
      await Browser.open({ url: fallbackUrl });
      return;
    }
  }

  await Browser.open({ url: fallbackUrl });
}

export const testing = {
  appleMapsUrl,
  googleMapsAppUrl,
  googleMapsWebUrl,
  meetingLabel
};
