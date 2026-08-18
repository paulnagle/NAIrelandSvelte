# Contributing

## Prerequisites

- Node.js 22+
- npm
- For iOS: Xcode 26+ and a macOS machine
- For Android: Android Studio and JDK 21

## Setup

```bash
npm install
cp .env.example .env      # then add your Google Maps keys
npm run dev               # http://localhost:5173
```

A checkout with no keys still builds, type-checks, and runs — only the map screen
is unavailable, and it says so rather than failing silently.

Run `npm run all` before pushing; CI enforces the same checks.

## Commands

```bash
npm run dev        # Vite dev server with HMR
npm run dev:host   # Same, exposed on the LAN for on-device testing
npm run build      # Production build into build/
npm run preview    # Serve the production build
npm run check      # svelte-check — types across .svelte and .ts
npm run lint       # Prettier check + ESLint
npm run format     # Prettier write
npm test           # Vitest
npm run coverage   # Vitest with a v8 coverage report
npm run all        # format → lint → check → test → build
npm run ios        # Build, sync, open Xcode
npm run android    # Build, sync, open Android Studio
npm run assets     # Regenerate native icons and splashes from assets/
```

## Tech Stack

| Category  | Technology                         |
| --------- | ---------------------------------- |
| Framework | SvelteKit 2 + Svelte 5 (runes API) |
| Build     | Vite + `adapter-static`            |
| Styling   | Tailwind CSS 4                     |
| Native    | Capacitor 8 (iOS + Android)        |
| Maps      | Google Maps                        |
| Language  | TypeScript 5 (strict)              |
| Testing   | Vitest + @testing-library/svelte   |
| Linting   | ESLint + Prettier + svelte-check   |

No component library — every UI primitive in `src/lib/components/` is hand-written.

## Project Structure

```
src/lib/
  api/            HTTP against the root server, plus Google Geocoding
    http.ts       The single request path — CapacitorHttp, so native avoids CORS
    bmlt.ts       Every BMLT endpoint the app calls
    formats.ts    Format id/code → readable name, cached
    geocode.ts    Address ⇄ coordinates
  meetings/       Pure domain logic, no framework, fully unit-tested
    time.ts       Wall-clock arithmetic — start, end, sort and filter keys
    kind.ts       In-person / virtual / hybrid / temporarily closed
    list.ts       Decorate, sort, group by weekday, filter
    address.ts    Address lines and the BMLT delimiter quirk
    share.ts      Share-sheet payload
  maps/           Key selection, SDK loading, REST fallback, marker grouping
  i18n/           Two languages (English + Gaeilge), bundled
  stores/         Settings, loading, drawer — Svelte 5 runes
  components/     Every UI primitive; no component library
src/routes/       One directory per screen
ios/ android/     Committed native projects — see below
```

The domain logic in `src/lib/meetings/` has no Svelte, no network, and no
`Date.now()` in its hot paths, so it is tested directly. That is where the
behaviour worth trusting lives — if you are writing date maths or classification
inside a `.svelte` file, it is in the wrong place.

## BMLT Endpoints

All meetings — physical, online, and hybrid — come from **`bmlt.nasouth.ie`** only.
The Virtual NA server is **not used**; the Ireland BMLT root already contains both
in-person and virtual/hybrid meetings. Online-only meetings are identified by
`venue_type=2`.

| Endpoint                          | URL                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| Meetings (by county, radius, ids) | `https://bmlt.nasouth.ie/main_server/client_interface/json/`                           |
| Just For Today                    | `https://www.jftna.org/jft/`                                                           |
| WordPress Events                  | `https://www.na-ireland.org/wp-json/wp/v2/posts?categories=9`                          |
| NA Speakers                       | `https://nasouth.ie/conventions.json`                                                  |
| Service Groups                    | `https://nasouth.ie/bmlt/main_server/client_interface/json/?switcher=GetServiceBodies` |

## Google Maps Keys

**Three of them**, because Google allows a key exactly one _application_
restriction — Websites, or iOS apps, or Android apps, never a combination.

| Variable                               | Restriction                                           | APIs                                          | Used by                                            |
| -------------------------------------- | ----------------------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| `PUBLIC_GOOGLE_MAPS_KEY_WEB`           | Websites                                              | Maps JavaScript, Places (New), Geocoding      | Everything, on the web only                        |
| `PUBLIC_GOOGLE_MAPS_KEY_IOS`           | iOS apps — `ie.nasouth.apple`                         | Maps SDK for iOS, Places (New), Geocoding     | Map, autocomplete and geocoding on iOS             |
| `PUBLIC_GOOGLE_MAPS_KEY_ANDROID`       | Android apps — `ie.nasouth.android.naireland` + SHA-1 | Maps SDK for Android, Places (New), Geocoding | Map, autocomplete and geocoding on Android         |
| `PUBLIC_GOOGLE_MAPS_ANDROID_CERT_SHA1` | —                                                     | —                                             | Proves the Android signature to the REST endpoints |

These are **public** variables: inlined into the client bundle and readable by
anyone using the app. That is inherent to client-side Maps keys — what protects
them is restriction, not secrecy. See [SECURITY.md](SECURITY.md).

### Why native does not use the JS SDK

Autocomplete and geocoding take a different path on device than on the web, and
the reason is worth stating plainly because the obvious approach does not work.

Inside a Capacitor webview there is no origin Google will accept. Its guidance is
explicit: _"API key website restrictions are not guaranteed to work correctly,
unless your web app is loaded using HTTP or HTTPS from a website that you control
and have authorized."_ A bundle served from `localhost` is not that, so a
referrer-restricted key is unsupported there — not merely weak.

The native SDKs are not an option either: `@capacitor/google-maps` wraps the Maps
SDK only, with no Places or geocoding surface.

So on device the app calls the Places and Geocoding **REST** endpoints with the
platform key and an app-identity header — `X-Ios-Bundle-Identifier`
(`ie.nasouth.apple`), or `X-Android-Package` (`ie.nasouth.android.naireland`)
plus `X-Android-Cert`. This is Google's documented mechanism for app-restricted
keys over HTTP.

The **Android SHA-1** must be registered on the key. `X-Android-Cert` is baked in
at build time from `PUBLIC_GOOGLE_MAPS_ANDROID_CERT_SHA1`. A stale SHA-1 returns
"Requests from this Android client application are blocked" — swallowed into an
empty suggestion list. If autocomplete works on web and not on Android, check this
first.

## Native

Capacitor wraps the same static bundle. Every route is prerendered
(`+layout.ts`), because there is no server inside a webview.

`CapacitorHttp` rather than `fetch` for BMLT calls: the root server does not send
permissive CORS headers, and an in-webview `fetch` is blocked outright on device.

`ios/` and `android/` **are committed**. They hold hand-written configuration
that `npx cap add` does not regenerate — the Maps key wiring, the location
permission strings, the manifest placeholders, the privacy manifest, and the
shared Xcode scheme. Only build products are ignored. `npx cap sync` is enough
after a dependency change; do not regenerate them wholesale.

Two things the Capacitor map plugin will mislead you about are documented in
[AGENTS.md](../AGENTS.md) — read it before touching the map screen.

### App Identities

| Platform | Identifier                     |
| -------- | ------------------------------ |
| iOS      | `ie.nasouth.apple`             |
| Android  | `ie.nasouth.android.naireland` |

## Testing

Unit tests cover the domain logic — time arithmetic, meeting classification,
grouping and filtering, marker clustering, the share payload, the HTTP wrapper's
handling of BMLT's quirks, and translation coverage.

```bash
npm test
npm run coverage
```

Types and tests do not catch the failures this app actually has. A blank map, an
autocomplete that silently returns nothing, a search that never fires — all were
invisible to both. **For anything user-facing, run it**, and for anything
touching the map or a native plugin, run it on a device.

## Translations

Two languages in `src/lib/i18n/locales/`: English (`en.json`) and Gaeilge
(`ie.json`). Both are bundled — not fetched. Language is stored as `'en'` or
`'ie'` in settings.

English is the source. Add new strings to `en.json` first; `ie.json` falls back
to English until a translator catches up.

## CI/CD

| Workflow             | Trigger            | Action                                               |
| -------------------- | ------------------ | ---------------------------------------------------- |
| `ci.yml`             | Push / PR          | Lint, type-check, test, and prove the build compiles |
| `android.yml`        | Manual or `v*` tag | Signed release APK + AAB as downloadable artifacts   |
| `ios-testflight.yml` | Manual or `v*` tag | Archive, export, and upload to TestFlight            |

### Releasing

Pushing a `v*` tag builds both apps and uploads iOS to TestFlight:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

### Required Repository Secrets

| Secret                          | Notes                                                        |
| ------------------------------- | ------------------------------------------------------------ |
| `GOOGLE_MAPS_KEY_WEB`           | Websites-restricted key                                      |
| `GOOGLE_MAPS_KEY_IOS`           | iOS-apps-restricted key (`ie.nasouth.apple`)                 |
| `GOOGLE_MAPS_KEY_ANDROID`       | Android-apps-restricted key (`ie.nasouth.android.naireland`) |
| `GOOGLE_MAPS_ANDROID_CERT_SHA1` | SHA-1 registered on the Android Maps key                     |
| `APPLE_TEAM_ID`                 | 10-character Apple team ID; kept out of the tree             |
| `APPSTORE_ISSUER_ID`            | App Store Connect API issuer for the team                    |
| `APPSTORE_KEY_ID`               | ASC API key id                                               |
| `APPSTORE_PRIVATE_KEY`          | The `.p8`, contents inline                                   |
| `IOS_DIST_CERT_P12_BASE64`      | Distribution `.p12`, base64                                  |
| `IOS_DIST_CERT_PASSWORD`        | Password for that `.p12`                                     |
| `ANDROID_KEYSTORE_BASE64`       | Upload keystore, base64                                      |
| `ANDROID_KEYSTORE_PASSWORD`     | Keystore password                                            |
| `ANDROID_KEY_ALIAS`             | Key alias (defaults to `upload`)                             |
| `ANDROID_KEY_PASSWORD`          | Key password                                                 |
