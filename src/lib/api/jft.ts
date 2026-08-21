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
 *
 * Table elements (<table>, <tbody>, <tr>, <td>) are replaced with <div>s so
 * that Tailwind 4's preflight (which sets border-style:solid on every element)
 * cannot interact with browser UA table-row styling to produce unwanted lines
 * between rows. The td's align attribute is preserved so existing CSS selectors
 * (td[align='left'], td[align='center']) continue to work on the divs.
 */
export function sanitiseJft(html: string): string {
  // Extract just the <body> contents if present; fall back to the full string.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const inner = bodyMatch ? bodyMatch[1] : html;

  // Remove <link>, <script>, and <meta> elements (and their contents).
  // Also strip the ASCII double-quotes that jftna.org wraps around the pull-quote
  // italic (<i>…</i>) — the quote block's left-border styling replaces them visually.
  return inner
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*/gi, '')
    .replace(/<meta\b[^>]*/gi, '')
    .replace(/"(<i>)/gi, '$1')
    .replace(/(<\/i>)"/gi, '$1')
    .replace(/<table\b[^>]*>/gi, '<div class="jft-table">')
    .replace(/<\/table>/gi, '</div>')
    .replace(/<tbody\b[^>]*>/gi, '')
    .replace(/<\/tbody>/gi, '')
    .replace(/<tr\b[^>]*>/gi, '<div class="jft-row">')
    .replace(/<\/tr>/gi, '</div>')
    .replace(/<td\b([^>]*)>/gi, '<div$1>')
    .replace(/<\/td>/gi, '</div>');
}
