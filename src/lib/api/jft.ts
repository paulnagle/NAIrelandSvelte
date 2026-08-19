import { httpGetText } from './http.ts';
import { isNative } from '$lib/platform.js';

// On native (iOS/Android) CapacitorHttp bypasses CORS entirely, so we can
// reach jftna.org directly. On web the browser enforces CORS and jftna.org
// sends no permissive headers, so requests are routed through the local
// /api/jft proxy (Vite in dev, Cloudflare Pages Function in production).
const JFT_DIRECT_URL = 'https://www.jftna.org/jft/';
const JFT_PROXY_PATH = '/api/jft';

/**
 * Fetches the Just For Today reading and returns the raw HTML string.
 */
export async function getJft(): Promise<string> {
  const url = isNative() ? JFT_DIRECT_URL : JFT_PROXY_PATH;
  return httpGetText(url);
}
