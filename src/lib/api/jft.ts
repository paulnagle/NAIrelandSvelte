import { httpGetText } from './http.ts';
import { isNative } from '$lib/platform.js';

// On native (iOS/Android) CapacitorHttp bypasses CORS entirely, so we can
// reach jftna.org directly. On web the browser enforces CORS and jftna.org
// sends no permissive headers, so requests are routed through the local
// /api/jft proxy (Vite in dev, Cloudflare Pages Function in production).
const JFT_DIRECT_URL = 'https://www.jftna.org/jft/';
const JFT_PROXY_PATH = '/api/jft';

/**
 * Fetches the Just For Today reading and returns the HTML content.
 *
 * jftna.org returns a full HTML document including <head>, <link>, <script>,
 * and <meta> tags. Injecting those raw into the app via {@html} causes the
 * webview to load the external smartphone.css stylesheet (which disturbs the
 * status bar on iOS/Android) and execute a redirect script. We strip everything
 * outside the <body> and remove any remaining <link>, <script>, and <meta>
 * elements before the caller injects the markup.
 */
export async function getJft(): Promise<string> {
  const url = isNative() ? JFT_DIRECT_URL : JFT_PROXY_PATH;
  const raw = await httpGetText(url);
  return sanitiseJft(raw);
}

/**
 * Strips document boilerplate from a jftna.org HTML response, leaving only
 * the inner body content with <link>, <script>, and <meta> tags removed.
 */
export function sanitiseJft(html: string): string {
  // Extract just the <body> contents if present; fall back to the full string.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const inner = bodyMatch ? bodyMatch[1] : html;

  // Remove <link>, <script>, and <meta> elements (and their contents).
  return inner
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*/gi, '')
    .replace(/<meta\b[^>]*/gi, '');
}
