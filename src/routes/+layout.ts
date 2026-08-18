// Capacitor ships a static bundle; all routes must be prerendered.
// SSR is disabled because there is no server at runtime — just a static bundle
// loaded from capacitor:// (iOS) or http://localhost (Android).
export const prerender = true;
export const ssr = false;
