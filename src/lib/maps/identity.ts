import { isIOS, isAndroid } from '$lib/platform.js';
import { certSha1 } from './keys.js';

/**
 * Returns the correct identity headers for Google Maps REST calls on native.
 *
 * Google validates these headers against the key's application restrictions:
 *   - iOS: bundle-ID header checked against the key's iOS app restriction.
 *   - Android: package + SHA-1 checked against the key's Android restriction.
 *   - Web: no headers needed — the web key uses HTTP-referrer restriction and
 *     cannot be used from a Capacitor webview anyway (localhost is not a
 *     registered referrer). REST calls from web go through the JS SDK instead.
 */
export function getAppIdentityHeaders(): Record<string, string> {
  if (isIOS()) {
    return { 'X-Ios-Bundle-Identifier': 'ie.nasouth.apple' };
  }
  if (isAndroid()) {
    return {
      'X-Android-Package': 'ie.nasouth.android.naireland',
      'X-Android-Cert': certSha1()
    };
  }
  // Web: no identity headers required.
  return {};
}
