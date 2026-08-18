import { httpGet } from './http.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single BMLT meeting record as returned by GetSearchResults. */
export interface Meeting {
  id_bigint: string;
  meeting_name: string;
  weekday_tinyint: string;
  start_time: string;
  duration_time: string;
  time_zone: string;
  venue_type: string;
  location_text: string;
  location_info: string;
  location_street: string;
  location_neighborhood: string;
  location_municipality: string;
  location_sub_province: string;
  location_province: string;
  location_postal_code_1: string;
  latitude: string;
  longitude: string;
  format_shared_id_list: string;
  formats: string;
  comments: string;
  virtual_meeting_link: string;
  phone_meeting_number: string;
  virtual_meeting_additional_info: string;
  service_body_bigint: string;
  worldid_mixed: string;
  root_server_uri: string;
  [key: string]: string;
}

/** A single BMLT service body record as returned by GetServiceBodies. */
export interface ServiceGroup {
  id: string;
  parent_id: string;
  name: string;
  description: string;
  type: string;
  url: string;
  helpline: string;
  world_id: string;
  [key: string]: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IRELAND_BMLT = 'https://bmlt.nasouth.ie/main_server/client_interface/json/';
const AGGREGATOR_BMLT = 'https://aggregator.bmltenabled.org/main_server/client_interface/json/';
const SERVICE_GROUPS_URL = 'https://nasouth.ie/bmlt/main_server/client_interface/json/?switcher=GetServiceBodies';
const CALLING_APP = 'callingApp=na_ireland_svelte';

// Simple in-memory cache for format lookups. A plain Map is fine — nothing
// renders from it, so SvelteMap is not needed.
const formatCache = new Map<string, Record<string, string>>();

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * Returns all distinct counties (location_sub_province values) from the
 * Ireland BMLT, sorted alphabetically.
 */
export async function getAllCounties(): Promise<{ location_sub_province: string }[]> {
  const url = IRELAND_BMLT + `?switcher=GetSearchResults&data_field_key=location_sub_province&sort_keys=location_sub_province&${CALLING_APP}`;
  return httpGet<{ location_sub_province: string }[]>(url);
}

/**
 * Returns meetings for the given county. Pass `""` (empty string) to get
 * online-only meetings (venue_type=2).
 */
export async function getMeetingsByCounty(county: string): Promise<Meeting[]> {
  let url: string;
  if (county === '') {
    url = IRELAND_BMLT + `?switcher=GetSearchResults&meeting_key=venue_type&meeting_key_value=2&sort_keys=weekday_tinyint,start_time&${CALLING_APP}`;
  } else {
    url = IRELAND_BMLT + `?switcher=GetSearchResults&meeting_key=location_sub_province&meeting_key_value=${encodeURIComponent(county)}&sort_keys=weekday_tinyint,start_time&${CALLING_APP}`;
  }
  return httpGet<Meeting[]>(url);
}

/**
 * Returns meetings within radiusKm of the given coordinates.
 * Uses negative geo_width_km for auto-radius behaviour.
 */
export async function getRadiusMeetings(lat: number, lng: number, radiusKm: number): Promise<Meeting[]> {
  const url = IRELAND_BMLT + `?switcher=GetSearchResults&geo_width_km=-${radiusKm}&long_val=${lng}&lat_val=${lat}&sort_keys=longitude,latitude&${CALLING_APP}`;
  return httpGet<Meeting[]>(url);
}

/**
 * Returns meetings by their comma-separated IDs string.
 */
export async function getMeetingsByIds(ids: string): Promise<Meeting[]> {
  const url = IRELAND_BMLT + `?switcher=GetSearchResults&meeting_ids[]=${ids}&${CALLING_APP}`;
  return httpGet<Meeting[]>(url);
}

/**
 * Returns all service groups from the Ireland BMLT.
 */
export async function getServiceGroups(): Promise<ServiceGroup[]> {
  const url = SERVICE_GROUPS_URL + `&${CALLING_APP}`;
  return httpGet<ServiceGroup[]>(url);
}

/**
 * Returns a map of format id → name_string for the given set of format IDs,
 * in the requested language. Falls back to English when the language is 'en'.
 * Results are cached per (ids, lang) key.
 */
export async function getFormats(ids: Set<string>, lang: string): Promise<Record<string, string>> {
  const idList = Array.from(ids).sort().join(',');
  const cacheKey = `${idList}:${lang}`;

  const cached = formatCache.get(cacheKey);
  if (cached) return cached;

  const baseUrl = AGGREGATOR_BMLT + `?switcher=GetFormats&show_all=1&format_ids=${idList}`;

  // Always fetch English first so we have fallback names
  const enResponse = await httpGet<{ id: string; name_string: string }[]>(baseUrl + '&lang_enum=en');
  const result: Record<string, string> = {};
  for (const format of enResponse) {
    result[format.id] = format.name_string;
  }

  // Overlay the requested language if it differs from English
  if (lang !== 'en') {
    const langResponse = await httpGet<{ id: string; name_string: string }[]>(baseUrl + `&lang_enum=${lang}`);
    for (const format of langResponse) {
      result[format.id] = format.name_string;
    }
  }

  formatCache.set(cacheKey, result);
  return result;
}
