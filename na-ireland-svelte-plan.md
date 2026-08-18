# NA Ireland Svelte — Rewrite Plan

## Overview

Port the functionality of **NA-Ireland-Ionic-6** (Angular/Ionic 6) into this repo (**NAIrelandSvelte**) using the same SvelteKit 5 / Tailwind 4 / Capacitor 8 patterns established by **BMLTSearchSvelte** (the reference rewrite of BMLTSearch3).

The scaffold is already in place: `app.html`, `app.css`, `vite.config.ts`, `svelte.config.js`, `package.json`, and `capacitor.config.ts` are all configured. No new dependencies are needed — the installed stack already covers everything the original app uses.

### App identity

| Property             | Value                          |
| -------------------- | ------------------------------ |
| Android appId        | `ie.nasouth.android.naireland` |
| iOS bundle ID        | `ie.nasouth.apple`             |
| App name             | `NA Ireland`                   |
| Primary colour       | `#000090` (deep NA blue)       |
| StatusBar background | `#000090`                      |

### What NA-Ireland-Ionic-6 has that BMLTSearch3 does not

| Feature                                   | Present in BMLTSearch3 | Present in NA-Ireland only |
| ----------------------------------------- | ---------------------- | -------------------------- |
| Meeting map + location search             | Yes                    | —                          |
| Full meeting list                         | Yes (listfull)         | —                          |
| Ireland-specific BMLT (`bmlt.nasouth.ie`) | —                      | Yes                        |
| Browse by county (sub_province)           | —                      | Yes                        |
| Just For Today (JFT)                      | —                      | Yes                        |
| Cleantime Calculator                      | —                      | Yes                        |
| NA Speakers audio                         | —                      | Yes                        |
| Events / Posts (WordPress)                | —                      | Yes                        |
| Contact (service groups + links)          | —                      | Yes                        |
| Settings (language only: en/ie)           | Partial (9 langs)      | en + Irish (Gaeilge)       |

### Single root server

All meetings — physical, online, and hybrid — come from **`bmlt.nasouth.ie`** only. The Virtual NA server (`bmlt.virtual-na.org`) is **not used**. The Ireland BMLT root already contains both in-person and virtual/hybrid meetings; online-only meetings are identified by `venue_type=2`.

### Architecture mapping (Ionic → SvelteKit)

| Ionic concept                | SvelteKit equivalent                                                     |
| ---------------------------- | ------------------------------------------------------------------------ |
| Pages (`/pages/`)            | Routes (`src/routes/`)                                                   |
| Angular services             | `src/lib/` modules (framework-free TS)                                   |
| `@Input()` components        | `$props()` Svelte 5 components                                           |
| `ngx-translate` + JSON       | `src/lib/i18n/` — flat JSON, bundled                                     |
| `NavParams` / Modal          | SvelteKit route parameters or inline panels                              |
| `IonAccordionGroup`          | Hand-written Svelte accordion component                                  |
| `moment` / `moment-timezone` | Plain arithmetic in `src/lib/meetings/time.ts`                           |
| `@ionic/storage`             | `localStorage` via a thin wrapper in `src/lib/stores/settings.svelte.ts` |

### Key API endpoints

- **Ireland BMLT** (all meetings): `https://bmlt.nasouth.ie/main_server/client_interface/json/`
- **JFT**: `https://www.jftna.org/jft/`
- **WordPress Events**: `https://www.na-ireland.org/wp-json/wp/v2/posts?categories=9`
- **Speakers**: `https://nasouth.ie/conventions.json`
- **Service Groups**: `https://nasouth.ie/bmlt/main_server/client_interface/json/?switcher=GetServiceBodies`

---

## Sub-Tasks

---

### Sub-Task 1 — App Shell, Routing, and Navigation

**Status:** `[x] done`

**Intent**  
Create the top-level app shell (header + bottom navigation), the SvelteKit route layout, and the main entry point. This is the skeleton everything else plugs into. The BMLTSearchSvelte `app.html` and `app.css` are already in place and identical — the shell components themselves still need to be created.

**Expected Outcomes**

- `src/routes/+layout.svelte` renders the app shell: header bar + bottom nav tab strip
- `src/routes/+layout.ts` marks all routes as prerendered (required for Capacitor static adapter)
- `src/lib/stores/settings.svelte.ts` holds reactive settings state (language, timeDisplay, distanceUnit) persisted to `localStorage`
- `src/lib/platform.ts` utility: `isNative()`, `isAndroid()`, `isIOS()`, `isWeb()` — thin wrappers around `Capacitor.isNativePlatform()` and `Capacitor.getPlatform()`
- `src/lib/i18n/` scaffold: an `en.json` and `ie.json` locale file (ported from the original), plus a `t()` lookup function
- SplashScreen is hidden on app init
- `body` receives `is-web` class when not running under Capacitor (required by `app.css` for text selection rules)
- Navigation tabs: Home, Meeting List, Map, JFT, Cleantime, Speakers, Events, Contact, Settings

**Todo List**

1. Create `src/routes/+layout.ts` — export `prerender = true`, `ssr = false`
2. Create `src/lib/platform.ts` — Capacitor platform detection helpers
3. Create `src/lib/stores/settings.svelte.ts` — `$state` for language, timeDisplay, distanceUnit, backed by `localStorage`
4. Create `src/lib/i18n/index.ts` — loads both locale JSONs, exposes `t(key)` reactive function
5. Copy and adapt `en.json` and `ie.json` from `NA-Ireland-Ionic-6/src/assets/translations/` into `src/lib/i18n/locales/`
6. Create `src/routes/+layout.svelte` — app shell with header bar and bottom nav; calls `SplashScreen.hide()` on mount; sets `is-web` on body
7. Create `src/lib/components/AppBar.svelte` — title bar component (slot for title, safe-top padding)
8. Create `src/lib/components/BottomNav.svelte` — bottom nav with tab icons and active-route highlight

**Relevant Context**

- `src/app.css` already has `safe-top`, `safe-bottom`, `app-main`, and `map-underlay` classes
- `src/app.html` has `apple-mobile-web-app-title` set to "NA Ireland" — this is already correct
- `capacitor.config.ts` has `appId: 'app.bmlt.search'` — may need updating to `app.na-ireland` or similar (out of scope here, flag for later)
- BMLTSearchSvelte CONTRIBUTING.md describes the `src/lib/` structure to follow exactly
- Do not use `@ionic/storage` — `localStorage` is sufficient and framework-free
- Do not use `moment` — the cleantime calculator will use plain `Date` arithmetic (Sub-Task 7)
- Language is stored as `'en'` or `'ie'` (not `'ga'`) to match the original keys

---

### Sub-Task 2 — BMLT API Layer

**Status:** `[x] done`

**Intent**  
Create the framework-free API module for all BMLT and external HTTP calls. All requests must go through `CapacitorHttp` (never `fetch`) to avoid CORS failures on device. A failed request must never silently look like an empty result.

**Expected Outcomes**

- `src/lib/api/http.ts` — single HTTP wrapper around `CapacitorHttp`; absorbs the two BMLT wire quirks: empty result sets arrive as `{}` not `[]`, and bodies sometimes arrive as unparsed strings; throws a typed error on failure (never returns `[]` on a non-200)
- `src/lib/api/bmlt.ts` — every BMLT endpoint the app calls, all typed:
  - `getMeetingsByCounty(county: string)` — Ireland BMLT
  - `getAllCounties()` — Ireland BMLT (returns `location_sub_province` field only)
  - `getMeetingsByIds(ids: string)` — Ireland BMLT
  - `getRadiusMeetings(lat, lng, radiusKm)` — Ireland BMLT (for map search)
  - `getServiceGroups()` — Ireland BMLT service bodies
  - `getFormats(ids: Set<string>, lang: string)` — Ireland BMLT format lookup
- `src/lib/api/jft.ts` — fetches `https://www.jftna.org/jft/`, returns raw HTML string
- `src/lib/api/wordpress.ts` — fetches `https://www.na-ireland.org/wp-json/wp/v2/posts?categories=9`, returns post array
- `src/lib/api/speakers.ts` — fetches `https://nasouth.ie/conventions.json`, returns conventions array

**Todo List**

1. Create `src/lib/api/http.ts` — `httpGet<T>(url: string): Promise<T>` using `CapacitorHttp`; handle `{}` → `[]` normalisation; throw on non-200; parse string bodies
2. Create `src/lib/api/bmlt.ts` — typed functions for all Ireland BMLT endpoints listed above; export `MeetingSource` type (only `'ireland'` needed here, not `'tomato'`/`'virtual'` — NA Ireland uses one root server for in-person and the Virtual NA server for online)
3. Create `src/lib/api/formats.ts` — `getFormatNames(ids: Set<string>, lang: string): Promise<Record<string, string>>` with simple in-memory cache (a plain `Map` — nothing renders from it)
4. Create `src/lib/api/jft.ts`
5. Create `src/lib/api/wordpress.ts`
6. Create `src/lib/api/speakers.ts`

**Relevant Context**

- `NA-Ireland-Ionic-6/src/app/services/meeting-list.service.ts` — source of all BMLT URLs
- `NA-Ireland-Ionic-6/src/environments/environment.prod.ts` — confirms the three base URLs
- `NA-Ireland-Ionic-6/src/app/services/service-groups.service.ts` — service bodies endpoint
- `NA-Ireland-Ionic-6/src/app/services/tomato-formats.service.ts` — format resolution pattern to port
- The Ireland BMLT uses `venue_type=2` to query online-only meetings (when county is blank) — see `list.page.ts` line 43
- `NA-Ireland-Ionic-6` does NOT use the Virtual NA server for its map search — it only uses `bmlt.nasouth.ie`
- Write unit tests for `http.ts` (the `{}` → `[]` normalisation is exactly the kind of silent bug that needs a test)

---

### Sub-Task 3 — Meeting Domain Logic

**Status:** `[x] done`

**Intent**  
Create the pure, framework-free domain logic for meeting data. This is the code most worth testing: time display, meeting classification (in-person/virtual/hybrid/temp-closed), grouping by weekday, address formatting, format explosion, and the share payload. No Svelte, no network calls in this layer.

**Expected Outcomes**

- `src/lib/meetings/types.ts` — TypeScript interfaces: `Meeting`, `MeetingGroup`, `Format`
- `src/lib/meetings/kind.ts` — `getMeetingKind(meeting)` → `'inperson' | 'virtual' | 'hybrid' | 'tempclosed' | 'tempreplace'` (ported from `meeting-card.component.ts` `getMeetingType()`)
- `src/lib/meetings/time.ts` — `formatStartTime(meeting, display: '12hr' | '24hr')`, `formatEndTime(meeting)` — wall-clock arithmetic in minutes, no date library
- `src/lib/meetings/address.ts` — `formatAddress(meeting)` — renders the address fields present in the BMLT record, handles the `tidyDelimiter` pipe (replaces `##` / `@@` separators with `, `)
- `src/lib/meetings/formats.ts` — `explodeFormats(meeting, formatNames: Record<string, string>)` — splits `format_shared_id_list` and resolves to human names
- `src/lib/meetings/list.ts` — `groupByWeekday(meetings[])` → `MeetingGroup[]` (array indexed 1–7), `filterByDay()`, `filterByHourRange()`, `sortWithinDay()`
- `src/lib/meetings/share.ts` — `buildSharePayload(meeting, t: (key: string) => string)` for `@capacitor/share`
- Unit tests for all of the above in `src/tests/unit/meetings/`

**Todo List**

1. Create `src/lib/meetings/types.ts`
2. Create `src/lib/meetings/kind.ts` + tests
3. Create `src/lib/meetings/time.ts` + tests (no `moment`, no date-fns; test the `{}` → correct output path)
4. Create `src/lib/meetings/address.ts` + tests (include the `##` / `@@` delimiter case from `tidy-delimiter.pipe.ts`)
5. Create `src/lib/meetings/formats.ts` + tests
6. Create `src/lib/meetings/list.ts` + tests (grouping, filtering, sorting)
7. Create `src/lib/meetings/share.ts` + tests

**Relevant Context**

- `NA-Ireland-Ionic-6/src/app/components/meeting-card/meeting-card.component.ts` — `getMeetingType()`, `isTempClosed()`, `isHybrid()`, `setMeetingEnd()`, `shareMeeting()`
- `NA-Ireland-Ionic-6/src/app/components/meeting-list/meeting-list.component.ts` — `groupMeetingList()`, `formatMeetingList()`, `filterMeetings()`, `setRawStartTime()`
- `NA-Ireland-Ionic-6/src/app/pipes/tidy-delimiter.pipe.ts` — the delimiter replacement that must be ported to `address.ts`
- The original uses `moment` throughout for time display and for virtual meeting timezone conversion — replace with plain arithmetic; the `agents.md` rule is explicit: no date library
- For virtual meeting times: the original converts from meeting's timezone to device local time using `moment-timezone`. The new version should show the time in the meeting's own timezone with the timezone name appended (as per BMLTSearchSvelte pattern described in the README: "a meeting's time is shown in its own timezone, labelled, rather than silently converted")
- `AGENTS.md` rule: `prefer $derived to $effect`; but this sub-task is pure TS, no Svelte

---

### Sub-Task 4 — MeetingCard and MeetingList Components

**Status:** `[x] done`

**Intent**  
Build the reusable `MeetingCard` and `MeetingList` Svelte components that replace the Angular `meeting-card` and `meeting-list` components. These are the most-used UI building blocks — every screen that shows meetings uses them.

**Expected Outcomes**

- `src/lib/components/MeetingCard.svelte` — renders a single meeting: weekday badge (pastel colour from `app.css` design tokens), meeting name, address, format string, virtual/phone links, directions button, share button; uses `$props()`
- `src/lib/components/MeetingList.svelte` — takes an array of meetings, groups them by weekday using `list.ts`, renders a day-header accordion with `MeetingCard` items inside; day filter chips at top; `expandAll` prop
- `src/lib/components/WeekdayBadge.svelte` — the coloured day + time badge (extracted so it can be tested and reused on the map callout)
- `src/lib/components/MeetingDetail.svelte` — the slide-up panel that replaces the Ionic modal; shown when a marker is tapped on the map or a meeting is tapped in the list

**Todo List**

1. Create `src/lib/components/WeekdayBadge.svelte` — accepts `weekday: number`, `startTime: string`, `endTime: string`; applies the correct `--color-*` token
2. Create `src/lib/components/MeetingCard.svelte` — full port of `meeting-card.component.html/ts`; no Ionic components; use Tailwind + Lucide icons; selectable address/phone text (`.selectable` class from `app.css`)
3. Create `src/lib/components/MeetingList.svelte` — accordion grouped by day, day-filter row, hour-range filter; uses `$derived` for filtered/grouped list
4. Create `src/lib/components/MeetingDetail.svelte` — bottom-sheet / slide-up panel for map marker tap; accepts `meetings: Meeting[]`

**Relevant Context**

- `NA-Ireland-Ionic-6/src/app/components/meeting-card/meeting-card.component.html` — full template to port
- `NA-Ireland-Ionic-6/src/app/components/meeting-list/meeting-list.component.html` — accordion structure to replicate
- `app.css` already has the seven `--color-sunday` through `--color-saturday` tokens
- `AGENTS.md`: never key `{#each}` by user data that can repeat — key by index
- `AGENTS.md`: use `SvelteSet`/`SvelteMap` when the template reads them
- The `selectable` CSS class must be applied to address text, phone numbers, and dial-in details so users can copy them on device
- `@capacitor/share` is already in `package.json` — use `Share.canShare()` to conditionally show the share button

---

### Sub-Task 5 — Home Screen

**Status:** `[x] done`

**Intent**  
Build the Home screen — a simple branding/welcome page that is the default route. In the original it is just the NA Ireland logo filling the content area.

**Expected Outcomes**

- `src/routes/+page.svelte` renders the home screen: NA Ireland logo centred, app title, welcome message from i18n
- The logo image (`web_hi_res_512.png`) is copied from `NA-Ireland-Ionic-6/src/assets/` into `static/`

**Todo List**

1. Copy `NA-Ireland-Ionic-6/src/assets/web_hi_res_512.png` into `static/`
2. Create `src/routes/+page.svelte` — displays the logo and translated title/welcome message

**Relevant Context**

- `NA-Ireland-Ionic-6/src/app/pages/home/home.page.html` — original template (very simple)
- Translation keys: `HOME_TITLE`, `HOME_MESSAGE`

---

### Sub-Task 6 — Meeting List Screen (Browse by County)

**Status:** `[x] done`

**Intent**  
Build the meeting list screen — the Ireland-specific "browse by county" feature. First shows a list of counties; tapping a county fetches and shows that county's meetings grouped by weekday using `MeetingList`.

**Expected Outcomes**

- `src/routes/list/+page.svelte` — two-state view: county list OR meeting list for selected county
- County list is fetched from the Ireland BMLT on mount, de-duplicated from `location_sub_province`, sorted; empty `location_sub_province` maps to "Online"
- Tapping a county fetches its meetings and switches to the meeting list view
- Back button in header returns to the county list
- Loading states with a spinner; error state with retry button (a failed fetch must never look like an empty result)
- Online meetings use `venue_type=2` query (not county name) as in the original

**Todo List**

1. Create `src/routes/list/+page.svelte` — county list view with `$state` for `view: 'counties' | 'meetings'`
2. Wire to `getAllCounties()` and `getMeetingsByCounty()` from `src/lib/api/bmlt.ts`
3. Render county list as tappable items with a chevron
4. On county tap: fetch meetings, switch view, show `MeetingList` component
5. Implement loading spinner and error/retry state

**Relevant Context**

- `NA-Ireland-Ionic-6/src/app/pages/list/list.page.ts` and `list.page.html` — full source
- The original de-duplicates counties client-side after fetching all `location_sub_province` values — preserve this approach
- `AGENTS.md`: `prefer $derived to $effect` — derive the de-duplicated sorted county list from the raw API response rather than seeding it in an effect

---

### Sub-Task 7 — Map Search Screen

**Status:** `[x] done`

**Intent**  
Build the map search screen — the most complex screen in the app. Shows a Google Map, searches for meetings within the visible radius on camera idle, supports place autocomplete search, and opens a meeting detail panel on marker tap. This screen follows the same pattern as BMLTSearchSvelte's map screen and must observe all the map plugin pitfalls documented in `AGENTS.md`.

**Expected Outcomes**

- `src/routes/map/+page.svelte` — full map search screen
- `src/lib/maps/keys.ts` — `webKey()`, `iosKey()`, `androidKey()` (already present as a concept in `agents.md`; populate from `import.meta.env`)
- `src/lib/maps/identity.ts` — `getAppIdentityHeaders()` for REST calls on native
- `src/lib/maps/rest.ts` — Places autocomplete and geocoding over REST for native
- `src/lib/maps/loader.ts` — Google Maps JS SDK loader for web (using `@googlemaps/js-api-loader`)
- Map renders correctly on Android (transparent layers via `map-underlay` CSS class)
- iOS map creation follows the two-animation-frame delay pattern
- `moveCamera()` guards against `setCamera` before map exists
- `searchAfterMove` flag prevents unintended re-searches on marker tap
- Place autocomplete shows suggestions, geocodes selection, searches around result
- "Locate me" button uses `@capacitor/geolocation`
- Marker tap opens `MeetingDetail` panel

**Todo List**

1. Create `src/lib/maps/keys.ts`
2. Create `src/lib/maps/identity.ts`
3. Create `src/lib/maps/rest.ts` — Places autocomplete + geocoding REST
4. Create `src/lib/maps/loader.ts` — JS SDK loader for web
5. Create `src/routes/map/+page.svelte` — full map screen following the iOS/Android patterns in `AGENTS.md` exactly
6. Wire to `getRadiusMeetings()` from `src/lib/api/bmlt.ts`
7. Add `map-underlay` class to `<html>` on Android while map is mounted; remove on destroy
8. Implement autocomplete input + suggestion list
9. Implement "locate me" with `@capacitor/geolocation`
10. Add `MeetingDetail` panel triggered by marker tap

**Relevant Context**

- `NA-Ireland-Ionic-6/src/app/pages/map-search/map-search.page.ts` — the full original implementation (all 552 lines)
- `AGENTS.md` map section — three specific pitfalls with the Capacitor plugin that cost three separate days
- `BMLTSearchSvelte/CONTRIBUTING.md` — "Why native does not use the JS SDK" section explains REST vs SDK path
- The map uses `bmlt.nasouth.ie` exclusively — all meeting types (in-person, hybrid, virtual) are in that one server; no Virtual NA calls
- The hardcoded API key at line 173 of `map-search.page.ts` must NOT be copied — use `import.meta.env` only
- `debounceTimestamp` pattern for preventing rapid re-searches should be preserved

---

### Sub-Task 8 — Just For Today (JFT) Screen

**Status:** `[x] done`

**Intent**  
Build the JFT screen — fetches today's reading from `jftna.org` and renders the HTML content.

**Expected Outcomes**

- `src/routes/jft/+page.svelte` — fetches JFT HTML on mount, renders it safely inside a card
- Loading state; error state with retry

**Todo List**

1. Create `src/routes/jft/+page.svelte`
2. Wire to `getJft()` from `src/lib/api/jft.ts`
3. Render the HTML response using `{@html content}` (the original used `[innerHtml]="jft"`)
4. Loading spinner; error message with retry button

**Relevant Context**

- `NA-Ireland-Ionic-6/src/app/pages/jft/jft.page.html` and `jft.page.ts`
- The JFT response is raw HTML — render it with `{@html}` inside a wrapper with the `.selectable` class so the reading text can be copied

---

### Sub-Task 9 — Cleantime Calculator Screen

**Status:** `[x] done`

**Intent**  
Build the cleantime calculator — lets a member enter their clean date and see how long they have been clean, with keytag milestones displayed when today is an anniversary.

**Expected Outcomes**

- `src/routes/cleantime/+page.svelte` — date input, clean time display (years/months/days), keytag display on anniversaries
- Clean date is persisted to `localStorage` via the settings store
- All time arithmetic uses plain `Date` — no `moment`, no `moment-precise-range-plugin`
- Keytag images are copied from `NA-Ireland-Ionic-6/src/assets/keytags/` into `static/keytags/`
- Milestone logic: 1 day, 30 days, 60 days, 90 days, 6 months (~182 days), 9 months (~274 days), 18 months (~547 days), 1 year (exact calendar anniversary), multiple years (exact calendar anniversary)
- `src/lib/meetings/cleantime.ts` — pure `getCleanTime(cleanDate: Date, today: Date)` and `getCleanTimeTag(cleanDate, today)` functions, unit tested

**Todo List**

1. Copy keytag images from `NA-Ireland-Ionic-6/src/assets/keytags/` into `static/keytags/`
2. Create `src/lib/meetings/cleantime.ts` — `getCleanTime()` and `getCleanTimeTag()` with unit tests; fix the 6/9/18-month approximation bugs (the original uses fixed day counts which drift — use calendar month comparison instead)
3. Create `src/routes/cleantime/+page.svelte` — native date input, results card, keytag card on anniversary

**Relevant Context**

- `NA-Ireland-Ionic-6/src/app/pages/datetime/datetime.page.ts` and `datetime.page.html`
- The original has known TODOs for the 6/9/18-month calculations (day-count approximations) — the new version should fix these using calendar arithmetic
- Translation keys: `ENTERCLEANDATE`, `YEARS`, `MONTHS`, `DAYS`, `BIRTHDAY`, `DAYCLEAN`, `DAYSCLEAN`, `MONTHSCLEAN`, `YEARCLEAN`, `YEARSCLEAN`
- `AGENTS.md`: "Where this app deliberately diverges from the original, the tests say so" — the cleantime fix should have a test asserting the corrected behaviour

---

### Sub-Task 10 — NA Speakers Screen

**Status:** `[x] done`

**Intent**  
Build the speakers screen — fetches convention data from `nasouth.ie/conventions.json` and renders a list of conventions, each with a list of speaker recordings that open in the browser.

**Expected Outcomes**

- `src/routes/speakers/+page.svelte` — list of conventions with speaker buttons that open URLs via `@capacitor/browser`
- Loading state; error state with retry

**Todo List**

1. Create `src/routes/speakers/+page.svelte`
2. Wire to `getConventions()` from `src/lib/api/speakers.ts`
3. Render conventions → speakers hierarchy; `Browser.open(url)` on speaker tap
4. Loading spinner; error/retry

**Relevant Context**

- `NA-Ireland-Ionic-6/src/app/pages/speakers/speakers.page.html` and `speakers.page.ts`
- The API returns `{ Conventions: [{ convention_name, speakers: [{ Title, fileName }] }] }`

---

### Sub-Task 11 — Events / Posts Screen

**Status:** `[x] done`

**Intent**  
Build the events screen — fetches posts from the NA Ireland WordPress site and renders a card list with an excerpt and "More details" link.

**Expected Outcomes**

- `src/routes/events/+page.svelte` — list of WordPress posts, each with title, excerpt, and a "More details" button that opens the post URL in the browser

**Todo List**

1. Create `src/routes/events/+page.svelte`
2. Wire to `getPosts()` from `src/lib/api/wordpress.ts`
3. Render post cards with `{@html post.title.rendered}` and `{@html post.excerpt.rendered}`
4. "More details" button: `Browser.open(post.link)`
5. Loading spinner; error/retry

**Relevant Context**

- `NA-Ireland-Ionic-6/src/app/pages/events/events.page.html` and `events.page.ts`
- WordPress REST API response shape: `[{ title: { rendered }, excerpt: { rendered }, link }]`
- Both title and excerpt are HTML strings — use `{@html}` with a containing `.selectable` wrapper

---

### Sub-Task 12 — Contact Screen

**Status:** `[x] done`

**Intent**  
Build the contact screen — fetches NA Ireland service bodies from the BMLT and renders each with its name, description, website, helpline, and email. Also shows app links (source code, bug report, BMLT info, NAWS app).

**Expected Outcomes**

- `src/routes/contact/+page.svelte` — service group cards + app info links section
- Service bodies fetched from Ireland BMLT on mount; each card shows name, description, website (clickable), helpline (dial link), email (mailto link)
- Static app links: GitHub source, bug tracker, BMLT Facebook group, BMLT website, NAWS iOS/Android store links

**Todo List**

1. Create `src/routes/contact/+page.svelte`
2. Wire to `getServiceGroups()` from `src/lib/api/bmlt.ts`
3. Render service group cards with conditional sections for url/helpline/email
4. Render app info section with `Browser.open()` links
5. Loading spinner; error/retry

**Relevant Context**

- `NA-Ireland-Ionic-6/src/app/pages/contact/contact.page.html` and `contact.page.ts`
- GitHub links should point to the new repo (`NAIrelandSvelte`), not the old one
- Translation keys: `CONTACT.DETAILS`, `CONTACT.APPDETAILS`, `CONTACT.APPSOURCE`, `CONTACT.REPORTBUG`, `CONTACT.MOREBMLT`, `CONTACT.JOINFACE`, `CONTACT.VISITWEB`, `CONTACT.NAWSAPP`, `CONTACT.NAWSBLURB`

---

### Sub-Task 13 — Settings Screen

**Status:** `[x] done`

**Intent**  
Build the settings screen — language selection (English / Gaeilge only), time display (12hr/24hr). Settings are persisted and immediately applied app-wide via the reactive settings store.

**Expected Outcomes**

- `src/routes/settings/+page.svelte` — language picker (en/ie), time display toggle
- Changing language immediately re-translates the UI app-wide
- Changing time display immediately updates meeting time rendering app-wide
- Settings persisted to `localStorage`

**Todo List**

1. Create `src/routes/settings/+page.svelte`
2. Bind language and timeDisplay selectors to the settings store from Sub-Task 1
3. Language change must update `<html lang>` attribute and re-run `t()` for all keys

**Relevant Context**

- `NA-Ireland-Ionic-6/src/app/pages/settings/settings.page.ts` and `settings.page.html`
- The original only supports `en` and `ie` (Irish/Gaeilge) — not the 9 languages of BMLTSearch3; keep it to these two
- `AGENTS.md`: `prefer $derived to $effect` — derive the display from the store value rather than setting state in an effect

---

### Sub-Task 14 — Environment Config, `capacitor.config.ts`, and `.env.example`

**Status:** `[x] done`

**Intent**
Update the app identity, Capacitor config, colour tokens, and environment variable documentation to reflect NA Ireland rather than BMLT Search.

**Expected Outcomes**

- `capacitor.config.ts` updated: `appId` → `ie.nasouth.android.naireland`, `appName` → `'NA Ireland'`, `backgroundColor` → `#000090`; iOS `scheme` → `'NA Ireland'`; StatusBar background → `#000090`
- `src/app.css` updated: `--color-bmlt` and related primary colour tokens changed from `#0a61ad` to `#000090`; `--color-bmlt-shade` and `--color-bmlt-tint` derived from `#000090`
- `src/app.html` updated: `theme-color` meta tag → `#000090`; `apple-mobile-web-app-title` already correct ("NA Ireland")
- `vite.config.ts` manifest: `name` → `'NA Ireland'`, `short_name` → `'NA Ireland'`, `description` → appropriate NA Ireland description, `theme_color` and `background_color` → `#000090`
- `.env.example` updated: remove BMLT Search commentary; document the three Google Maps keys for NA Ireland's bundle/package IDs (`ie.nasouth.apple` for iOS, `ie.nasouth.android.naireland` for Android); note that the Ireland BMLT server requires no API key

**Todo List**

1. Update `capacitor.config.ts` — `appId: 'ie.nasouth.android.naireland'`, `appName: 'NA Ireland'`, all colour values to `#000090`
2. Update `src/app.css` — replace `#0a61ad` primary colour tokens with `#000090`; derive shade/tint accordingly
3. Update `src/app.html` — `theme-color` meta tag to `#000090`
4. Update `vite.config.ts` — PWA manifest name, description, colours
5. Update `.env.example` — reflect NA Ireland's bundle/package IDs in comments

**Relevant Context**

- `NA-Ireland-Ionic-6/capacitor.config.ts` (confirmed): `appId: 'ie.nasouth.android.naireland'`, `appName: 'NA Ireland'`, `backgroundColor: '#000090'`, `StatusBar.backgroundColor: '#000090'`
- iOS bundle ID (confirmed from Xcode project): `ie.nasouth.apple`
- Note: Capacitor's single `appId` field is used for Android; the iOS bundle identifier lives in the native Xcode project. The committed `ios/` directory already has the correct bundle ID
- The weekday colour tokens (sunday through saturday) and all non-primary tokens remain unchanged — only the primary BMLT blue → NA Ireland deep blue

---

### Sub-Task 15 — PWA Assets and Static Files

**Status:** `[x] done`

**Intent**
Copy and configure the static assets — app icon, PWA icons, keytag images, marker images — so the app looks correct on all surfaces. The keytag images are unique to NA Ireland and have no equivalent in BMLTSearchSvelte.

**Expected Outcomes**

- `static/` directory has the correct PWA icons (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`)
- Keytag images are in `static/keytags/`
- Map marker images (`MarkerBlue.png`, `MarkerRed.png`) are in `static/`
- NA Ireland logo (`web_hi_res_512.png`) is in `static/`

**Todo List**

1. Verify `static/` already has PWA icons (check current state) — if not, generate from `assets/` using `npm run assets` once icon source is correct
2. Copy keytag images from `NA-Ireland-Ionic-6/src/assets/keytags/` → `static/keytags/`
3. Copy marker images from `NA-Ireland-Ionic-6/src/assets/markers/` → `static/`
4. Copy `web_hi_res_512.png` → `static/`

**Relevant Context**

- `assets/` in this repo is the source for native icon generation (`npm run assets`)
- `static/` is what gets served to the browser and bundled into the PWA precache
- The `vite.config.ts` `includeAssets` list references specific icon filenames — must match what lands in `static/`

---

### Sub-Task 16 — Integration, Tests, and `npm run all` Green

**Status:** `[ ] pending`

**Intent**  
Wire everything together, run the full quality suite, and confirm the app builds and passes `npm run all` (format, lint, svelte-check, test, build) with no errors or new warnings.

**Expected Outcomes**

- `npm run all` passes at zero: `svelte-check` zero errors, all tests pass, build succeeds
- Test coverage meets the 70% threshold defined in `vite.config.ts`
- `README.md` and `.github/CONTRIBUTING.md` are created with correct project description

**Todo List**

1. Run `npm run all` and fix any type errors, lint issues, or test failures
2. Add `src/tests/unit/setup.ts` (required by `vite.config.ts`)
3. Ensure every route has a corresponding `+page.ts` with `export const prerender = true` (or that the layout-level setting covers it)
4. Create `README.md` for the project
5. Create `.github/CONTRIBUTING.md` following the BMLTSearchSvelte pattern, adjusted for NA Ireland

**Relevant Context**

- `vite.config.ts` test config: `setupFiles: './src/tests/unit/setup.ts'`, coverage threshold 70%
- `svelte.config.js`: `adapter-static` with `paths: { relative: true }` — all routes must be prerenderable
- `AGENTS.md`: "svelte-check must be at zero. Trust `npm run check`, not inline diagnostics"
