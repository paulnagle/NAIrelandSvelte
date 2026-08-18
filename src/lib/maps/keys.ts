import { isIOS, isAndroid } from '$lib/platform.js';

/** Google Maps JS SDK key for web (HTTP-referrer restricted). */
export function webKey(): string {
  return (import.meta.env.PUBLIC_GOOGLE_MAPS_KEY_WEB as string | undefined) ?? '';
}

/** Google Maps native SDK key for iOS (bundle-ID restricted). */
export function iosKey(): string {
  return (import.meta.env.PUBLIC_GOOGLE_MAPS_KEY_IOS as string | undefined) ?? '';
}

/** Google Maps native SDK key for Android (SHA-1 + package restricted). */
export function androidKey(): string {
  return (import.meta.env.PUBLIC_GOOGLE_MAPS_KEY_ANDROID as string | undefined) ?? '';
}

/**
 * The correct Maps key for the current platform.
 * On iOS → iosKey(); on Android → androidKey(); on web → webKey().
 */
export function platformKey(): string {
  if (isIOS()) return iosKey();
  if (isAndroid()) return androidKey();
  return webKey();
}

/**
 * The Android SHA-1 certificate fingerprint used in X-Android-Cert headers.
 * Must be registered on the Android Maps key in Google Cloud Console.
 */
export function certSha1(): string {
  return (import.meta.env.PUBLIC_GOOGLE_MAPS_ANDROID_CERT_SHA1 as string | undefined) ?? '';
}
