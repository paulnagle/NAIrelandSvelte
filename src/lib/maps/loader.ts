import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { webKey } from './keys.js';
import type { PlaceSuggestion } from './rest.js';
import type { LatLng } from '$lib/geo.js';

// ---------------------------------------------------------------------------
// Google Maps JS SDK loader for web
// ---------------------------------------------------------------------------

// @googlemaps/js-api-loader v2 uses a functional API (setOptions + importLibrary)
// rather than a Loader class. setOptions() is idempotent after first call.
let loaderPromise: Promise<void> | null = null;

/**
 * Loads the Google Maps JS SDK on web, importing the 'maps', 'places', and
 * 'geometry' libraries. Idempotent — multiple calls return the same promise.
 *
 * Never call this on native — native uses the SDK embedded in the Capacitor
 * plugin and REST endpoints for Places/geocoding. Calling this on native is
 * harmless but wasteful.
 */
export function loadMapsApi(): Promise<void> {
  if (loaderPromise) return loaderPromise;

  setOptions({ key: webKey(), v: 'weekly' });

  loaderPromise = Promise.all([importLibrary('maps'), importLibrary('marker'), importLibrary('places'), importLibrary('geometry')]).then(() => undefined);

  return loaderPromise;
}

/**
 * Autocomplete a partial address using the Places JS SDK (web only).
 * Fail-soft: returns [] on any error so a dead autocomplete does not break
 * the search box.
 */
export async function suggestPlacesWeb(input: string, language: string, session?: google.maps.places.AutocompleteSessionToken): Promise<PlaceSuggestion[]> {
  if (!input) return [];
  try {
    await loadMapsApi();
    const { AutocompleteSuggestion } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
    const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      language,
      ...(session ? { sessionToken: session } : {})
    });
    return (response.suggestions ?? []).map((s) => ({
      // text is the full address string (recommended for single UI elements).
      // mainText is the short name only (e.g. "Dublin" without the county/country).
      description: s.placePrediction?.text?.text ?? s.placePrediction?.mainText?.text ?? '',
      placeId: s.placePrediction?.placeId ?? ''
    }));
  } catch {
    return [];
  }
}

/**
 * Returns a new Places session token for the JS SDK (web only).
 */
export async function newSessionTokenWeb(): Promise<google.maps.places.AutocompleteSessionToken> {
  await loadMapsApi();
  const { AutocompleteSessionToken } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
  return new AutocompleteSessionToken();
}

/**
 * Resolve a place suggestion to coordinates using the Places JS SDK (web only).
 * Falls back to the JS SDK Geocoder for the address string if fetchFields fails.
 * Fail-soft: returns null on any error.
 *
 * Note: the REST geocodeAddress fallback that was here previously used
 * CapacitorHttp, which on web is patched to fetch(). The Geocoding API does not
 * send CORS headers for localhost or arbitrary origins, so that fallback always
 * failed silently on web. The Geocoding JS SDK is the correct path here.
 */
export async function placeLocationWeb(placeId: string, fallbackAddress: string): Promise<LatLng | null> {
  try {
    await loadMapsApi();
    const { Place } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
    const place = new Place({ id: placeId });
    await place.fetchFields({ fields: ['location'] });
    const loc = place.location;
    if (!loc) throw new Error('no location');
    return { lat: loc.lat(), lng: loc.lng() };
  } catch {
    // Fall back to the JS SDK Geocoder with the address string.
    try {
      await loadMapsApi();
      const { Geocoder } = (await google.maps.importLibrary('geocoding')) as google.maps.GeocodingLibrary;
      const geocoder = new Geocoder();
      const result = await geocoder.geocode({ address: fallbackAddress });
      const loc = result.results?.[0]?.geometry?.location;
      if (!loc) return null;
      return { lat: loc.lat(), lng: loc.lng() };
    } catch {
      return null;
    }
  }
}
