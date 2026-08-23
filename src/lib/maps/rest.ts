import { CapacitorHttp } from '@capacitor/core';
import { platformKey } from './keys.js';
import { getAppIdentityHeaders } from './identity.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLACES_BASE = 'https://places.googleapis.com/v1/places:autocomplete';
const GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlaceSuggestion {
  description: string;
  placeId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalises a CapacitorHttp response body to a parsed object.
 * Some environments deliver the body as an unparsed JSON string.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseBody(data: unknown): any {
  return typeof data === 'string' ? JSON.parse(data) : data;
}

// ---------------------------------------------------------------------------
// Autocomplete
// ---------------------------------------------------------------------------

/**
 * Calls the Places API (New) autocomplete endpoint over REST.
 *
 * Used on native platforms where the JS SDK cannot be used because the
 * Capacitor webview cannot satisfy an HTTP-referrer restriction.
 *
 * Fail-soft: returns [] on any error so a dead autocomplete does not break the
 * search box. If the key is stale or the cert SHA-1 is wrong the call silently
 * returns []; probe the endpoint directly with curl if suggestions are missing.
 */
export async function autocompletePlaces(input: string, lang: string): Promise<PlaceSuggestion[]> {
  if (!input) return [];

  try {
    const key = platformKey();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'suggestions.placePrediction.text,suggestions.placePrediction.placeId',
      ...getAppIdentityHeaders()
    };

    const response = await CapacitorHttp.post({
      url: PLACES_BASE,
      headers,
      data: {
        input,
        languageCode: lang
      }
    });

    if (response.status !== 200) return [];

    const body = parseBody(response.data);

    if (!body?.suggestions) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return body.suggestions.map((s: any) => ({
      description: s.placePrediction?.text?.text ?? s.placePrediction?.text ?? '',
      placeId: s.placePrediction?.placeId ?? ''
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Geocoding
// ---------------------------------------------------------------------------

/**
 * Geocodes a Place ID to { lat, lng } using the Geocoding REST API.
 * Fail-soft: returns null on any error.
 */
export async function geocodePlace(placeId: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const key = platformKey();
    const url = `${GEOCODE_BASE}?place_id=${encodeURIComponent(placeId)}&key=${encodeURIComponent(key)}`;

    const response = await CapacitorHttp.get({
      url,
      headers: getAppIdentityHeaders()
    });

    if (response.status !== 200) return null;

    const body = parseBody(response.data);

    const loc = body?.results?.[0]?.geometry?.location;
    if (!loc) return null;

    return { lat: Number(loc.lat), lng: Number(loc.lng) };
  } catch {
    return null;
  }
}

/**
 * Geocodes a free-text address string to { lat, lng }.
 * Fail-soft: returns null on any error.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const key = platformKey();
    const url = `${GEOCODE_BASE}?address=${encodeURIComponent(address)}&key=${encodeURIComponent(key)}`;

    const response = await CapacitorHttp.get({
      url,
      headers: getAppIdentityHeaders()
    });

    if (response.status !== 200) return null;

    const body = parseBody(response.data);

    const loc = body?.results?.[0]?.geometry?.location;
    if (!loc) return null;

    return { lat: Number(loc.lat), lng: Number(loc.lng) };
  } catch {
    return null;
  }
}
