/**
 * A single BMLT meeting record as returned by the Ireland BMLT
 * GetSearchResults endpoint. All fields are strings (the API never returns
 * numeric types in its JSON responses).
 */
export interface Meeting {
  id_bigint: string;
  meeting_name: string;
  weekday_tinyint: string; // '1' = Sunday … '7' = Saturday
  start_time: string; // 'HH:MM:SS'
  duration_time: string; // 'HH:MM:SS'
  time_zone: string;
  venue_type: string; // '1' = in-person, '2' = virtual, '3' = hybrid
  location_text: string;
  location_info: string;
  location_street: string;
  location_neighborhood: string;
  location_city_subsection: string;
  location_municipality: string;
  location_sub_province: string;
  location_province: string;
  location_postal_code_1: string;
  latitude: string;
  longitude: string;
  format_shared_id_list: string; // comma-separated format IDs
  formats: string; // comma-separated format key_strings, e.g. "VM,HY"
  comments: string;
  virtual_meeting_link: string;
  phone_meeting_number: string;
  virtual_meeting_additional_info: string;
  contact_phone_1: string;
  contact_email_1: string;
  bus_lines: string;
  train_lines: string;
  service_body_bigint: string;
  worldid_mixed: string;
  root_server_uri: string;
  [key: string]: string;
}

/**
 * Meetings for a single weekday. `weekday` is 1 (Sunday) … 7 (Saturday),
 * matching `meeting.weekday_tinyint` parsed as a number.
 */
export interface MeetingGroup {
  weekday: number;
  meetings: Meeting[];
}

/**
 * A single BMLT format record as returned by the GetFormats endpoint.
 */
export interface Format {
  id: string;
  name_string: string;
  key_string: string;
}

/** Classification of a meeting's attendance mode. */
export type MeetingKind = 'inperson' | 'virtual' | 'hybrid' | 'tempclosed' | 'tempreplace';
