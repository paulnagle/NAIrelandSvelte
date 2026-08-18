import { Capacitor } from '@capacitor/core';

/** Returns true when running inside a native Capacitor shell (iOS or Android). */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Returns true when running on Android. */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/** Returns true when running on iOS. */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/** Returns true when running in a plain web browser (not native). */
export function isWeb(): boolean {
  return !Capacitor.isNativePlatform();
}
