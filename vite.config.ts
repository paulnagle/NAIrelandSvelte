/// <reference types="vitest/config" />

import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Kit options (adapter, paths, runes) live in svelte.config.js — see the note
// there for why they can't be inline here.

export default defineConfig({
  server: {
    proxy: {
      // Proxy /api/jft to jftna.org so the browser never makes a cross-origin
      // request during development. CapacitorHttp handles this natively on
      // device; the Cloudflare Pages Function handles it in production.
      '/api/jft': {
        target: 'https://www.jftna.org',
        changeOrigin: true,
        rewrite: () => '/jft/'
      },
      '/api/posts': {
        target: 'https://www.na-ireland.org',
        changeOrigin: true,
        rewrite: () => '/wp-json/wp/v2/posts?categories=9&_embed=wp:featuredmedia'
      },
      '/api/conventions': {
        target: 'https://nasouth.ie',
        changeOrigin: true,
        rewrite: () => '/conventions.json'
      }
    }
  },
  // Vite only exposes VITE_-prefixed variables on `import.meta.env`; adding
  // PUBLIC_ lets the Maps keys be read that way instead of through
  // `$env/static/public`.
  //
  // The difference matters: `$env/static/public` is a hard build error when a
  // variable *name* is absent, not merely unset. That made `git clone && npm
  // run build` fail on a fresh checkout with an opaque MISSING_EXPORT, and it
  // failed the first Cloudflare Pages deploy before the project's environment
  // variables existed. `import.meta.env` yields undefined for an unset name, so
  // an unconfigured build succeeds and only the map screen reports itself
  // unavailable — which is the degradation the README always described.
  envPrefix: ['VITE_', 'PUBLIC_'],
  plugins: [
    tailwindcss(),
    sveltekit(),
    // SvelteKitPWA rather than plain VitePWA: the static adapter writes the
    // prerendered HTML after Vite's build finishes, so a plain Workbox glob runs
    // too early and precaches zero HTML — leaving the app broken offline. This
    // integration hooks the adapter's output instead.
    SvelteKitPWA({
      registerType: 'autoUpdate',
      // Registration happens in src/lib/pwa.ts so it can be skipped inside the
      // Capacitor shell, where a service worker only adds a stale-cache risk.
      injectRegister: null,
      manifestFilename: 'manifest.json',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'NA Ireland',
        short_name: 'NA Ireland',
        description: 'Find Narcotics Anonymous meetings in Ireland — in person, hybrid, and online.',
        theme_color: '#000090',
        background_color: '#000090',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['health', 'lifestyle', 'utilities'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Any navigation that misses the precache falls back to the app shell,
        // which is what makes a client-routed SPA work offline.
        navigateFallback: '/',
        runtimeCaching: [
          {
            // Meeting data must never come from a cache: a stale meeting sends
            // someone to a room that isn't open. The Ireland BMLT root, the
            // aggregator (used for formats), the Google APIs, and the NA Ireland
            // content endpoints (JFT, events, speakers, service groups) are all
            // network-only.
            urlPattern: ({ url }: { url: URL }) =>
              url.hostname === 'bmlt.nasouth.ie' ||
              url.hostname === 'aggregator.bmltenabled.org' ||
              url.hostname.endsWith('googleapis.com') ||
              url.hostname === 'www.na-ireland.org' ||
              url.hostname === 'nasouth.ie' ||
              url.hostname === 'www.jftna.org',
            handler: 'NetworkOnly'
          }
        ]
      },
      devOptions: { enabled: true }
    }),
    svelteTesting()
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/unit/setup.ts',
    include: ['src/tests/unit/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.{ts,svelte}'],
      exclude: ['src/tests/**'],
      thresholds: { lines: 70, functions: 70, statements: 70 }
    }
  }
});
