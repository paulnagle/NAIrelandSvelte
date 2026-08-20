import { httpGet } from './http.ts';
import type { Meeting } from '$lib/meetings/types.js';

export type { Meeting };

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
 * Returns every meeting within a true radius of the given coordinates.
 * Uses positive geo_width_km, trimmed to coordinates + id only for map use.
 * Only in-person (venue_type=1) and hybrid (venue_type=3) meetings — virtual
 * meetings carry arbitrary coordinates and must not appear as map pins.
 */
export async function meetingsWithinRadius(lat: number, lng: number, radiusKm: number): Promise<Meeting[]> {
  const url = IRELAND_BMLT + `?switcher=GetSearchResults&geo_width_km=${radiusKm}&long_val=${lng}&lat_val=${lat}` + `&sort_keys=longitude,latitude&venue_types[]=1&venue_types[]=3&${CALLING_APP}`;
  return httpGet<Meeting[]>(url);
}

/**
 * Returns meetings by their comma-separated IDs string.
 *
 * BMLT requires `meeting_ids[]` repeated once per id. Passing a comma-joined
 * string as a single parameter causes the server to treat it as one literal id
 * and silently return only the first match (or nothing).
 */
export async function getMeetingsByIds(ids: string): Promise<Meeting[]> {
  const repeated = ids
    .split(',')
    .filter(Boolean)
    .map((id) => `meeting_ids[]=${encodeURIComponent(id.trim())}`)
    .join('&');
  const url = IRELAND_BMLT + `?switcher=GetSearchResults&${repeated}&${CALLING_APP}`;
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
