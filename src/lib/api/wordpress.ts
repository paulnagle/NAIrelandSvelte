import { httpGet } from './http.ts';
import { isNative } from '$lib/platform.js';

// On native (iOS/Android) CapacitorHttp bypasses CORS entirely, so we can
// reach na-ireland.org directly. On web the browser enforces CORS and
// na-ireland.org sends no permissive headers, so requests are routed through
// the local /api/posts proxy (Vite in dev, Cloudflare Pages Function in production).
const WP_DIRECT_URL = 'https://www.na-ireland.org/wp-json/wp/v2/posts?categories=9&_embed=wp:featuredmedia';
const WP_PROXY_PATH = '/api/posts';

/** Minimal shape of a WP REST v2 media size entry. */
interface WpMediaSize {
  source_url: string;
  width: number;
  height: number;
}

export interface WpPost {
  date: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  link: string;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      media_details?: {
        sizes?: {
          medium?: WpMediaSize;
          thumbnail?: WpMediaSize;
          full?: WpMediaSize;
        };
        source_url?: string;
      };
      source_url?: string;
    }>;
  };
}

/**
 * Returns the best available image URL for a post:
 *  1. Featured media medium size (embedded via _embed)
 *  2. Featured media full / source_url
 *  3. First <img> found in content.rendered
 *  4. null if none found
 */
export function getPostImage(post: WpPost): string | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (media) {
    return (
      media.media_details?.sizes?.medium?.source_url ??
      media.media_details?.sizes?.full?.source_url ??
      media.source_url ??
      null
    );
  }
  // Fallback: parse first <img src> from content HTML
  const match = post.content.rendered.match(/<img[^>]+src="([^"]+)"/);
  return match?.[1] ?? null;
}

/**
 * Fetches NA Ireland WordPress posts for category 9 (events/news).
 */
export async function getPosts(): Promise<WpPost[]> {
  const url = isNative() ? WP_DIRECT_URL : WP_PROXY_PATH;
  return httpGet<WpPost[]>(url);
}
