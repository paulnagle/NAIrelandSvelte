import { httpGet } from './http.ts';
import { isNative } from '$lib/platform.js';

// On native (iOS/Android) CapacitorHttp bypasses CORS entirely, so we can
// reach nasouth.ie directly. On web the browser enforces CORS and nasouth.ie
// sends no permissive headers, so requests are routed through the local
// /api/conventions proxy (Vite in dev, Cloudflare Pages Function in production).
const CONVENTIONS_DIRECT_URL = 'https://nasouth.ie/conventions.json';
const CONVENTIONS_PROXY_PATH = '/api/conventions';

export interface Speaker {
  Title: string;
  fileName: string;
}

export interface Convention {
  convention_name: string;
  speakers: Speaker[];
}

export interface ConventionsResponse {
  Conventions: Convention[];
}

/**
 * Fetches the list of NA Ireland conventions and speakers.
 */
export async function getConventions(): Promise<ConventionsResponse> {
  const url = isNative() ? CONVENTIONS_DIRECT_URL : CONVENTIONS_PROXY_PATH;
  return httpGet<ConventionsResponse>(url);
}
