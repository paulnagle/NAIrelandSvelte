import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { webKey } from './keys.js';

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
