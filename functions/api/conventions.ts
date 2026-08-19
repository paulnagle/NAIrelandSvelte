/**
 * Cloudflare Pages Function: /api/conventions
 *
 * Proxies the NA Ireland conventions/speakers feed from nasouth.ie. Required
 * because nasouth.ie sends no CORS headers, so a browser fetch from a
 * different origin is blocked. CapacitorHttp handles this natively on device
 * (iOS/Android); this function handles it for web visitors.
 */
export async function onRequestGet(): Promise<Response> {
  const upstream = await fetch('https://nasouth.ie/conventions.json');

  if (!upstream.ok) {
    return new Response('Failed to fetch conventions', { status: upstream.status });
  }

  const json = await upstream.text();

  return new Response(json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
