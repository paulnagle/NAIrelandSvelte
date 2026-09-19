/**
 * Cloudflare Pages Function: /api/jft
 *
 * Proxies the Just For Today reading from na.org. Required because na.org
 * sends no CORS headers, so a browser fetch from a different origin is blocked.
 * CapacitorHttp handles this natively on device (iOS/Android); this function
 * handles it for web visitors.
 */
export async function onRequestGet(): Promise<Response> {
  const upstream = await fetch('https://na.org/jftna/');

  if (!upstream.ok) {
    return new Response('Failed to fetch JFT', { status: upstream.status });
  }

  const html = await upstream.text();

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
