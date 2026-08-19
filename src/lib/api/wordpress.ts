import { httpGet } from './http.ts';
import { isNative } from '$lib/platform.js';

// On native (iOS/Android) CapacitorHttp bypasses CORS entirely, so we can
// reach na-ireland.org directly. On web the browser enforces CORS and
// na-ireland.org sends no permissive headers, so requests are routed through
// the local /api/posts proxy (Vite in dev, Cloudflare Pages Function in production).
const WP_DIRECT_URL = 'https://www.na-ireland.org/wp-json/wp/v2/posts?categories=9';
const WP_PROXY_PATH = '/api/posts';

export interface WpPost {
  title: { rendered: string };
  excerpt: { rendered: string };
  link: string;
}

/**
 * Fetches NA Ireland WordPress posts for category 9 (events/news).
 */
export async function getPosts(): Promise<WpPost[]> {
  const url = isNative() ? WP_DIRECT_URL : WP_PROXY_PATH;
  return httpGet<WpPost[]>(url);
}
