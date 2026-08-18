import type { Meeting } from '$lib/meetings/types';
import { getStartTimeDisplay, getEndTime } from '$lib/meetings/time';

/**
 * Builds the payload for `@capacitor/share` for a given meeting.
 *
 * Ported from `shareMeeting()` in
 * `NA-Ireland-Ionic-6/src/app/components/meeting-card/meeting-card.component.ts`.
 *
 * @param meeting    The meeting to share.
 * @param dayName    The localised weekday name (caller resolves from i18n).
 * @param display    Time display preference, passed to the time formatters.
 * @returns          `{ title, text, url }` ready for `Share.share()`.
 */
export function buildSharePayload(meeting: Meeting, dayName: string, display: '12hr' | '24hr'): { title: string; text: string; url: string } {
  const startDisplay = getStartTimeDisplay(meeting, display);
  const endDisplay = getEndTime(meeting, display);

  let text = `${meeting.meeting_name} : ${dayName} ${startDisplay} - ${endDisplay} : `;

  if (meeting.location_text) text += meeting.location_text;
  if (meeting.location_street) text += ' , ' + meeting.location_street;
  if (meeting.location_city_subsection) text += ' , ' + meeting.location_city_subsection;
  if (meeting.location_neighborhood) text += ' , ' + meeting.location_neighborhood;
  if (meeting.location_municipality) text += ' , ' + meeting.location_municipality;
  if (meeting.location_sub_province) text += ' , ' + meeting.location_sub_province;
  if (meeting.location_postal_code_1) text += ' , ' + meeting.location_postal_code_1;
  if (meeting.location_info) text += ' , ' + meeting.location_info;
  if (meeting.comments) text += ' , ' + meeting.comments;
  if (meeting.train_lines) text += ' , ' + meeting.train_lines;
  if (meeting.bus_lines) text += ' , ' + meeting.bus_lines;
  if (meeting.phone_meeting_number) text += ' , ' + meeting.phone_meeting_number;

  const url = meeting.virtual_meeting_link ? meeting.virtual_meeting_link : `https://www.google.com/maps/search/?api=1&query=${meeting.latitude},${meeting.longitude}`;

  text += '    url: ' + url;

  return {
    title: meeting.meeting_name,
    text,
    url
  };
}
