import { isNative } from '$lib/platform.js';
import type { LatLng } from '$lib/geo.js';
import { autocompletePlaces, geocodePlace } from './rest.js';
import { newSessionTokenWeb, placeLocationWeb, suggestPlacesWeb } from './loader.js';
import type { PlaceSuggestion } from './rest.js';

export type { PlaceSuggestion };

/**
 * Platform-routing facade for Places autocomplete and place-location resolution.
 *
 * - **Native** → REST with the platform key and app-identity headers.
 *   A Capacitor webview cannot satisfy an HTTP-referrer restriction.
 * - **Web** → the Places JS SDK with the referrer-restricted web key.
 *
 * Callers import only from this module and never branch on platform themselves.
 */

/**
 * A billing session, grouping a burst of keystrokes and the lookup that follows.
 *
 * Native wants an opaque string; the SDK wants its own token object.
 * Callers only ever pass it straight back to `suggestPlaces`.
 */
export type PlacesSession = string | google.maps.places.AutocompleteSessionToken | undefined;

/**
 * Returns a fresh session token for the current platform.
 * Pass the result into `suggestPlaces` to group autocomplete keystrokes for billing.
 */
export async function newSessionToken(): Promise<PlacesSession> {
  if (isNative()) {
    // Any sufficiently unique opaque string; Google only uses it to group
    // requests for billing.
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return newSessionTokenWeb();
}

/**
 * Autocomplete a partial address.
 * Fail-soft: returns [] on any error so a dead autocomplete does not break the search box.
 */
export async function suggestPlaces(input: string, language: string, session?: PlacesSession): Promise<PlaceSuggestion[]> {
  if (isNative()) {
    return autocompletePlaces(input, language);
  }
  return suggestPlacesWeb(input, language, typeof session === 'string' ? undefined : session);
}

/**
 * Resolve a place suggestion to coordinates.
 * Fail-soft: returns null on any error.
 */
export async function placeLocation(placeId: string, fallbackDescription = ''): Promise<LatLng | null> {
  if (isNative()) return geocodePlace(placeId);
  return placeLocationWeb(placeId, fallbackDescription);
}
