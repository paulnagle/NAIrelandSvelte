/**
 * Cloudflare Pages Function: /api/posts
 *
 * Proxies the NA Ireland WordPress posts feed. Required because
 * www.na-ireland.org sends no CORS headers, so a browser fetch from a
 * different origin is blocked. CapacitorHttp handles this natively on device
 * (iOS/Android); this function handles it for web visitors.
 */
export async function onRequestGet(): Promise<Response> {
  const upstream = await fetch('https://www.na-ireland.org/wp-json/wp/v2/posts?categories=9&_embed=wp:featuredmedia');

  if (!upstream.ok) {
    return new Response('Failed to fetch posts', { status: upstream.status });
  }

  const json = await upstream.text();

  return new Response(json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
