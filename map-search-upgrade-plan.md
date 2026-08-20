# Map Search Upgrade Plan

## Overview

Replace the current `src/routes/map/+page.svelte` with a near-direct port of the
reference implementation in `tmp/BMLTSearchSvelte/src/routes/map-search/+page.svelte`.

The reference has a significantly better search UX:

- Auto-searches on first camera idle (map is not blank on open)
- "Search this area" button only appears when the viewport has moved enough to
  warrant a new search (25% of visible radius), instead of always showing
- Sequence guards prevent stale search results overwriting newer ones
- Typed errors (`BmltError` / clear error surface) rather than swallowed errors
- `distanceKm` is computed with plain Haversine math instead of loading the
  Google Maps geometry library
- `buildMarkers` collapses co-located meetings into single venue pins via a Map
  keyed on rounded coordinates — already present in the current code but defined
  separately so it can be tested

The adaptation keeps:

- The app's BMLT URL (`bmlt.nasouth.ie`, not the aggregator)
- The existing `Meeting` type from `src/lib/meetings/types.ts`
- The existing `MeetingDetail` bottom-sheet component
- The existing `autocompletePlaces` / `geocodePlace` / `geocodeAddress` functions
  from `src/lib/maps/rest.ts`
- The existing `settings` store (language, theme, etc.)
- The existing translation keys

New shared utility files are created under `src/lib/` so the map route stays
small and the helpers are independently testable.

---

## Sub-Tasks

---

### Sub-task 1 — Add `src/lib/geo.ts`

**Status:** [ ] pending

**Intent**
Pull pure distance and coordinate-key math out of the map component and into a
framework-free, testable utility, identical to the reference.

**Expected Outcomes**

- `src/lib/geo.ts` exists and exports `LatLng`, `distanceKm`, `coordinateKey`
- No other files are changed in this sub-task
- `npm run check` passes

**Todo List**

1. Create `src/lib/geo.ts` copied verbatim from
   `tmp/BMLTSearchSvelte/src/lib/geo.ts`
   (the file has no dependencies on anything outside itself)

**Relevant Context**

- Reference: `tmp/BMLTSearchSvelte/src/lib/geo.ts`
- `distanceKm` replaces the current dependency on `google.maps.geometry.spherical`
  inside `doGetMeetings` in the map route — currently the route cannot compute
  radius without the Maps SDK loaded

---

### Sub-task 2 — Add `src/lib/maps/places.ts`

**Status:** [ ] pending

**Intent**
Create a platform-routing facade for autocomplete and place-location resolution
that picks the correct implementation (REST on native, JS SDK on web) in one
place, so the map route contains no `if (isNative())` branches for Places calls.

**Expected Outcomes**

- `src/lib/maps/places.ts` exists and exports
  `newSessionToken`, `suggestPlaces`, `placeLocation`, `PlaceSuggestion`,
  `PlacesSession`
- `npm run check` passes

**Todo List**

1. Read `tmp/BMLTSearchSvelte/src/lib/maps/places.ts` carefully
2. Create `src/lib/maps/places.ts` adapted to this project:
   - Replace `import { isNative } from '../native'` with
     `import { isNative } from '$lib/platform.js'`
   - Replace `import * as sdk from './loader'` with the existing
     `src/lib/maps/loader.ts` exports — the current loader only exposes
     `loadMapsApi()`, so the web path for `suggestPlaces` and `placeLocation`
     must call the existing `fetchWebSuggestions` / `geocodeWebPlace` patterns
     currently inlined in the route, **or** we add thin `suggestPlaces` /
     `placeLocation` helpers to `src/lib/maps/loader.ts` first
   - The native path calls the existing `autocompletePlaces` and `geocodePlace`
     from `src/lib/maps/rest.ts` (already present with the same signatures)
   - The `PlaceSuggestion` type is already defined in `src/lib/maps/rest.ts`;
     re-export it from `places.ts` to give callers a single import point

**Relevant Context**

- Reference: `tmp/BMLTSearchSvelte/src/lib/maps/places.ts`
- Current native REST functions: `src/lib/maps/rest.ts` —
  `autocompletePlaces(input, lang)`, `geocodePlace(placeId)`,
  `geocodeAddress(address)`
- Current web path is inlined in `src/routes/map/+page.svelte` as
  `fetchWebSuggestions` and `geocodeWebPlace`; these need to move into
  `src/lib/maps/loader.ts` as exported functions

**Note on loader.ts**
The current `src/lib/maps/loader.ts` only exports `loadMapsApi`. Before creating
`places.ts`, add two exported async functions to `loader.ts`:

- `suggestPlacesWeb(input: string, language: string): Promise<PlaceSuggestion[]>`
- `placeLocationWeb(placeId: string, fallbackAddress: string): Promise<LatLng | null>`

These extract the web-only logic currently inlined in the route.

---

### Sub-task 3 — Add `src/lib/maps/markers.ts`

**Status:** [ ] pending

**Intent**
Extract the `buildMarkers` / `coordinateKey` / `iconFor` logic into a standalone
file. The current route already does coordinate-key grouping inline in
`groupMeetings()`; this moves it to a testable module.

**Expected Outcomes**

- `src/lib/maps/markers.ts` exists and exports `buildMarkers`, `iconFor`,
  `MeetingMarker`, `SINGLE_ICON`, `SHARED_ICON`
- `npm run check` passes

**Todo List**

1. Create `src/lib/maps/markers.ts` adapted from
   `tmp/BMLTSearchSvelte/src/lib/maps/markers.ts`:
   - Replace `RawMeeting` with the existing `Meeting` type from
     `src/lib/meetings/types.ts`
   - Replace `import { coordinateKey } from '../geo'` with
     `import { coordinateKey } from '$lib/geo.js'` (created in sub-task 1)
   - The `buildMarkers` function logic is identical — group by `coordinateKey`,
     collect `ids`, return `MeetingMarker[]`

**Relevant Context**

- Reference: `tmp/BMLTSearchSvelte/src/lib/maps/markers.ts`
- Depends on sub-task 1 (`geo.ts` for `coordinateKey`)
- `Meeting.id_bigint` is a `string` — same as `RawMeeting.id_bigint`

---

### Sub-task 4 — Add `src/lib/stores/loading.svelte.ts`

**Status:** [ ] pending

**Intent**
Add the counted loading-overlay store. The current map route uses individual
`searching` / `detailLoading` booleans that can collide when requests overlap.

**Expected Outcomes**

- `src/lib/stores/loading.svelte.ts` exists and exports `loading`
- `npm run check` passes

**Todo List**

1. Create `src/lib/stores/loading.svelte.ts` copied verbatim from
   `tmp/BMLTSearchSvelte/src/lib/stores/loading.svelte.ts`
   (no external dependencies — plain `$state` runes class)

**Relevant Context**

- Reference: `tmp/BMLTSearchSvelte/src/lib/stores/loading.svelte.ts`

---

### Sub-task 5 — Add i18n keys for the map search screen

**Status:** [ ] pending

**Intent**
Add missing translation keys used by the new map route. The current `en.json`
has `SEARCH_THIS_AREA` but the reference uses `SEARCH_AREA`; the reference also
uses `MAP_SEARCH`, `SEARCH_PLACEHOLDER`, and `FINDING_MTGS` (already present).

**Expected Outcomes**

- All nine locale JSON files have the new keys added (English values only;
  other locales fall back to English automatically as per the project's i18n
  approach)
- `npm run check` passes

**Todo List**

1. Identify the translation keys the new route will use:
   - `SEARCH_AREA` (button label — "Search this area"; use existing
     `SEARCH_THIS_AREA` value)
   - `MAP_SEARCH` (page title — "Meetings Map")
   - `SEARCH_PLACEHOLDER` (input placeholder — "Search…")
   - `FINDING_MTGS` already present
   - `MEETING_DETAILS` already present
   - `CANCEL` already present
2. Add `SEARCH_AREA`, `MAP_SEARCH`, `SEARCH_PLACEHOLDER` to all locale files
   under `src/lib/i18n/locales/`
   - Use the English value for all locales (existing translators handle the rest)

**Relevant Context**

- `src/lib/i18n/locales/en.json` — existing keys
- Project i18n rule: add new strings to `en.json` only and let the rest fall back

---

### Sub-task 6 — Rewrite `src/routes/map/+page.svelte`

**Status:** [ ] pending

**Intent**
Replace the current 758-line monolithic map page with a clean port of the
reference implementation, wired to the helpers created in sub-tasks 1–5 and the
existing app's types, API, and components.

**Expected Outcomes**

- The map opens at the centre of Ireland (53.1424, -7.6921) — the app searches
  Ireland-only meetings, so the fallback is Ireland's geographic centre, not LA
- On first camera idle the map auto-searches and renders markers
- Moving the map beyond a meaningful threshold shows the "Search this area"
  button; moving back within it hides it
- Tapping a marker opens the existing `MeetingDetail` bottom sheet with the
  meetings at that location
- Tapping a place suggestion moves the map to that place and searches
- Pressing "Locate me" moves the camera to device position
- A loading indicator is shown while any search is in flight (using the new
  `loading` store)
- Stale search results from a previous request never overwrite a newer search
- `npm run all` passes (format, lint, check, test, build)

**Todo List**

1. Read sub-tasks 1–5 context and confirm all helper files exist
2. Rewrite `src/routes/map/+page.svelte` from scratch, adapting the reference:
   a. **Imports**: use `$lib/geo.js`, `$lib/maps/places.js`, `$lib/maps/markers.js`,
   `$lib/stores/loading.svelte.js`, existing `getRadiusMeetings`,
   `getMeetingsByIds`, `getFormats` from `$lib/api/bmlt.js`, existing
   `MeetingDetail`, `settings`, `isAndroid` from `$lib/platform.js`
   b. **FALLBACK_CENTRE**: `{ lat: 53.1424, lng: -7.6921 }` (centre of Ireland)
   c. **`MIN_SEARCH_ZOOM`**: 8 (same as reference)
   d. **Map creation**: single `GoogleMap.create()` path — no web/native branching
   in the component (the plugin abstracts this)
   e. **`start()`**: same pattern as reference — `currentPosition(6000)` racing
   against the fallback, then `createMap`, then `moveCamera`
   f. **`onCameraIdle`**: port directly; use `distanceKm` from `$lib/geo.js`
   instead of `google.maps.geometry.spherical`
   g. **`runSearch()`**: call `getRadiusMeetings` (positive km, not negative);
   sequence guard identical to reference
   h. **`drawMarkers()`**: call `buildMarkers` from `$lib/maps/markers.js`;
   use `iconFor` to pick icon; store `markerIds` map for click → id lookup
   i. **`onMarkerClick()`**: look up ids from `markerIds` map, call
   `getMeetingsByIds`, load formats via `getFormats`, open `MeetingDetail`
   j. **Search input**: call `suggestPlaces` from `$lib/maps/places.js`;
   session token via `newSessionToken`; `choose()` calls `placeLocation`
   then `moveCamera`
   k. **Locate button**: `locateAndRecentre()` identical to reference
   l. **Android underlay**: `onMount` adds `map-underlay` class on Android
   (identical to reference — required for native map visibility)
   m. **`MeetingDetail`** props: `meetings`, `formatNames`, `onClose` — matches
   the existing component's interface exactly
   n. **Loading**: use `loading.begin(t('FINDING_MTGS'))` / `release()` instead
   of the boolean `searching` flag; the template shows a spinner while
   `loading.active`
   o. **Error**: `let error = $state('')`; show retry option as reference does
   p. **i18n**: use `t('MAP_SEARCH')` for title, `t('SEARCH_PLACEHOLDER')` for
   input, `t('SEARCH_AREA')` for button, `t('MEETING_DETAILS')` for sheet
   title, `t('FINDING_MTGS')` for loading message

3. Remove the now-unused inline helper functions (`groupMeetings`,
   `fetchWebSuggestions`, `geocodeWebPlace`, `createMapWeb`, `createMapNative`,
   `webClusterRenderer`, `addMarkersWeb`, `removeMarkersWeb`) — all replaced by
   the helper modules

4. Run `npm run all` and fix any type errors or lint issues

**Relevant Context**

- Reference: `tmp/BMLTSearchSvelte/src/routes/map-search/+page.svelte`
- `getRadiusMeetings(lat, lng, km)` in `src/lib/api/bmlt.ts` uses **negative**
  km (`geo_width_km=-${radiusKm}`) for auto-radius mode; the reference uses
  **positive** km for a true-radius search. Add a new `meetingsWithinRadius`
  function to `src/lib/api/bmlt.ts` that uses positive km alongside the existing
  `getRadiusMeetings` — this avoids breaking any other callers.
- `getMeetingsByIds(ids: string)` takes a comma-joined string, not an array.
  The reference `meetingsByIds(ids: string[])` takes an array. The new route
  calls the existing function — convert the array to string with `.join(',')`.
- `MeetingDetail` props: `meetings: Meeting[]`, `formatNames: Record<string,string>`,
  `onClose: () => void` — no `open` prop; the component is only rendered
  conditionally (`{#if detailOpen}`)
- **Locate button**: match the reference exactly — a "locate and re-centre"
  button separate from the search bar (not inline with the search input)
- **`loader.ts` web helpers**: add `suggestPlacesWeb` and `placeLocationWeb`
  to `src/lib/maps/loader.ts`; `places.ts` calls them for the web path

---

### Sub-task 7 — Final validation

**Status:** [ ] pending

**Intent**
Verify the full `npm run all` pipeline passes and the map screen works visually.

**Expected Outcomes**

- `npm run all` (format, lint, check, test, build) exits 0 with no new errors
- Map opens, searches on first idle, shows markers, tapping a marker opens the
  detail sheet, search input offers suggestions and moves the map

**Todo List**

1. Run `npm run all`
2. Fix any remaining issues
3. Optionally run `npm run dev` and verify the map screen manually in browser
