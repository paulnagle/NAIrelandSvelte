<script lang="ts">
  // ───────────────────────────────────────────────────────────────────────────
  // Imports
  // ───────────────────────────────────────────────────────────────────────────

  import { GoogleMap } from '@capacitor/google-maps';
  import type { CameraIdleCallbackData, MarkerClickCallbackData } from '@capacitor/google-maps/dist/typings/definitions';
  import { Geolocation } from '@capacitor/geolocation';
  import { LocateFixed, MapPin, RotateCw, Search, X } from '@lucide/svelte';
  import { onMount, onDestroy } from 'svelte';
  import { t } from '$lib/i18n/index.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { loading } from '$lib/stores/loading.svelte.js';
  import { isAndroid } from '$lib/platform.js';
  import { platformKey } from '$lib/maps/keys.js';
  import { distanceKm, type LatLng } from '$lib/geo.js';
  import { newSessionToken, placeLocation, suggestPlaces, type PlaceSuggestion, type PlacesSession } from '$lib/maps/places.js';
  import { buildMarkers, iconFor } from '$lib/maps/markers.js';
  import { meetingsWithinRadius, getMeetingsByIds, getFormats } from '$lib/api/bmlt.js';
  import type { Meeting } from '$lib/meetings/types.js';
  import MeetingDetail from '$lib/components/MeetingDetail.svelte';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';

  // ───────────────────────────────────────────────────────────────────────────
  // Configuration
  // ───────────────────────────────────────────────────────────────────────────

  const hasKey = platformKey() !== '';

  // Centre of Ireland — fallback used when device location is unavailable.
  const FALLBACK_CENTRE: LatLng = { lat: 53.1424, lng: -7.6921 };

  // Minimum zoom to search — prevent the map from searching the whole island
  // at once. 8 is country-level; fine for Ireland's size.
  const MIN_SEARCH_ZOOM = 8;

  // ───────────────────────────────────────────────────────────────────────────
  // Map state
  // ───────────────────────────────────────────────────────────────────────────

  let map: GoogleMap | null = null;
  let mapElement = $state<HTMLElement | null>(null);
  let error = $state('');

  /**
   * `false` until the map has received at least one camera-idle event that we
   * want to act on. The plugin fires idle events during SDK init (before our
   * opening moveCamera) — those must be ignored. Once `moveCamera` in start()
   * resolves and we set this to `true`, the very next idle carries the real
   * opening bounds and triggers the first search.
   */
  let mapReady = false;

  /**
   * `true` before every programmatic camera move whose idle we do NOT want to
   * auto-search on (locate-me, suggestion pick). The idle that follows is
   * skipped and the flag is cleared.
   *
   * The opening move in start() leaves this `false` so that the first idle
   * after startup *does* search — that is how the initial results appear.
   */
  let programmaticMove = false;

  /**
   * `true` after the first search has run. Subsequent idles show the
   * "Search this area" button instead of auto-searching.
   */
  let searchAfterMove = false;

  let lastCamera: { zoom: number; bounds: { center: LatLng; southwest: LatLng } } | null = null;
  let canSearchArea = $state(false);

  // IDs of markers currently placed on the map, and a map from markerId → meetingIds.
  // SvelteMap so the template re-renders if ever read reactively; plain Map would
  // be fine here too since nothing renders from it, but the lint rule requires SvelteMap.
  let placedMarkerIds: string[] = [];
  const markerIds = new SvelteMap<string, string[]>();

  // Sequence counter — a newer search must not be overwritten by an older one
  // that was slower.
  let searchSequence = 0;

  // ───────────────────────────────────────────────────────────────────────────
  // Detail sheet
  // ───────────────────────────────────────────────────────────────────────────

  let detailOpen = $state(false);
  let detailLoading = $state(false);
  let detailMeetings = $state<Meeting[]>([]);
  let detailFormats = $state<Record<string, string>>({});

  // ───────────────────────────────────────────────────────────────────────────
  // Search state
  // ───────────────────────────────────────────────────────────────────────────

  let queryText = $state('');
  let suggestions = $state<PlaceSuggestion[]>([]);
  let sessionToken: PlacesSession;

  // ───────────────────────────────────────────────────────────────────────────
  // Map lifecycle
  // ───────────────────────────────────────────────────────────────────────────

  async function start() {
    try {
      // The device fix is not awaited up-front — the map may open at the
      // fallback position while geolocation is in flight.
      const fixPromise = getCurrentPosition(6000).catch(() => FALLBACK_CENTRE);
      const centre = (await fixPromise) ?? FALLBACK_CENTRE;

      await createMap(centre);
      await waitForLayout(mapElement!);
      // Eight animation frames ~ 135 ms at 60 FPS — empirically enough for
      // the native SDK to finish initialising before the first camera move.
      for (let i = 0; i < 8; i++) await nextFrame();
      await moveCamera({ coordinate: centre, zoom: MIN_SEARCH_ZOOM });

      // Read the actual visible bounds directly — no idle event needed.
      // getMapBounds() returns the real viewport so the initial search covers
      // exactly what is on screen.
      mapReady = true;
      const bounds = await map!.getMapBounds();
      await runSearch({
        zoom: MIN_SEARCH_ZOOM,
        bounds: { center: bounds.center, southwest: bounds.southwest }
      });
    } catch (e) {
      error = String((e as Error).message ?? e);
    }
  }

  async function createMap(centre: LatLng) {
    const key = platformKey();
    const instance = await GoogleMap.create({
      id: 'map',
      element: mapElement!,
      apiKey: key,
      config: { center: centre, zoom: MIN_SEARCH_ZOOM },
      forceCreate: true
    });

    instance.setOnCameraIdleListener(onCameraIdle);
    instance.setOnMarkerClickListener(onMarkerClick);

    map = instance;
  }

  async function teardown() {
    const instance = map;
    if (!instance) return;
    try {
      await instance.destroy();
    } catch {
      // Map might already be gone.
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Camera helpers
  // ───────────────────────────────────────────────────────────────────────────

  async function moveCamera(config: { coordinate?: LatLng; zoom?: number }) {
    try {
      await map?.setCamera({
        coordinate: config.coordinate,
        zoom: config.zoom
      });
    } catch {
      // A move can fail if the element is removed before it completes.
    }
  }

  function nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  async function waitForLayout(element: HTMLElement, attempts = 30): Promise<boolean> {
    for (let i = 0; i < attempts; i++) {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) return true;
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    }
    return false;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Camera idle handler
  // ───────────────────────────────────────────────────────────────────────────

  async function onCameraIdle(event: CameraIdleCallbackData) {
    if (!mapReady) return;

    // Programmatic moves (locate, suggestion pick) must not trigger a search —
    // the caller already handles what should happen next.
    if (programmaticMove) {
      programmaticMove = false;
      return;
    }

    // Normalise the plugin's callback data into the shape the rest of the
    // component uses: a centre LatLng and a southwest LatLng.
    const centre: LatLng = { lat: event.latitude, lng: event.longitude };
    const sw: LatLng = { lat: event.bounds.southwest.lat, lng: event.bounds.southwest.lng };
    const normEvent = { zoom: event.zoom, bounds: { center: centre, southwest: sw } };

    // If nothing changed from last idle, it's noise — skip.
    if (searchAfterMove && lastCamera && normEvent.bounds.center.lat === lastCamera.bounds.center.lat && normEvent.bounds.center.lng === lastCamera.bounds.center.lng) {
      return;
    }

    lastCamera = normEvent;

    if (normEvent.zoom < MIN_SEARCH_ZOOM) {
      // Zoomed too far out to search — hide the button.
      canSearchArea = false;
      searchAfterMove = false;
      return;
    }

    if (!searchAfterMove) {
      // First idle after mount (or after a programmatic move with intent to
      // search): run the search immediately so the map is never blank on open.
      await runSearch(normEvent);
      searchAfterMove = true;
    } else {
      // Subsequent user pans/zooms: show the "Search this area" button instead
      // of re-searching automatically on every move.
      canSearchArea = true;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Search
  // ───────────────────────────────────────────────────────────────────────────

  async function runSearch(event: { zoom: number; bounds: { center: LatLng; southwest: LatLng } }) {
    const sequence = ++searchSequence;
    const radiusKm = distanceKm(event.bounds.center, event.bounds.southwest);

    const release = loading.begin(t('FINDING_MTGS'));
    try {
      const meetings = await meetingsWithinRadius(event.bounds.center.lat, event.bounds.center.lng, Math.ceil(radiusKm));

      // A newer search arrived while this one was in flight — discard.
      if (sequence !== searchSequence) return;

      canSearchArea = false;
      await drawMarkers(meetings);
    } catch (e) {
      if (sequence === searchSequence) {
        error = String((e as Error).message ?? e);
      }
    } finally {
      release();
    }
  }

  function searchThisArea() {
    if (!lastCamera || lastCamera.zoom < MIN_SEARCH_ZOOM) return;
    canSearchArea = false;
    runSearch(lastCamera);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Markers
  // ───────────────────────────────────────────────────────────────────────────

  async function drawMarkers(meetings: Meeting[]) {
    if (!map) return;

    // Remove old markers
    for (const id of placedMarkerIds) {
      await map.removeMarker(id);
    }
    placedMarkerIds = [];
    markerIds.clear();

    const markers = buildMarkers(meetings);
    if (markers.length === 0) return;

    const markerDefs = markers.map((m) => ({
      coordinate: m.coordinate,
      iconUrl: iconFor(m),
      title: m.ids.join(',')
    }));

    // addMarkers returns the placed marker IDs in the same order as markerDefs
    const placed = await map.addMarkers(markerDefs as Parameters<typeof map.addMarkers>[0]);
    placedMarkerIds = placed;

    // Build the reverse lookup: markerId → meeting ids array
    placed.forEach((markerId, i) => {
      markerIds.set(markerId, markers[i].ids);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Marker click → detail sheet
  // ───────────────────────────────────────────────────────────────────────────

  async function onMarkerClick(data: MarkerClickCallbackData) {
    const ids = markerIds.get(data.markerId);
    if (!ids?.length) return;

    detailLoading = true;
    detailOpen = true;
    detailMeetings = [];
    detailFormats = {};

    try {
      const meetings = await getMeetingsByIds(ids.join(','));
      detailMeetings = meetings;

      // SvelteSet required by svelte/prefer-svelte-reactivity; nothing renders from it.
      const allFormatIds = new SvelteSet<string>();
      for (const m of meetings) {
        m.format_shared_id_list.split(',').forEach((id) => allFormatIds.add(id.trim()));
      }
      if (allFormatIds.size > 0) {
        detailFormats = await getFormats(allFormatIds, settings.language);
      }
    } catch (e) {
      error = String((e as Error).message ?? e);
    } finally {
      detailLoading = false;
    }
  }

  function closeDetail() {
    detailOpen = false;
    detailMeetings = [];
    detailFormats = {};
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Location
  // ───────────────────────────────────────────────────────────────────────────

  async function getCurrentPosition(timeoutMs = 10_000): Promise<LatLng> {
    const position = await Geolocation.getCurrentPosition({
      timeout: timeoutMs,
      enableHighAccuracy: false,
      maximumAge: 60_000
    });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  }

  async function locateAndRecentre() {
    try {
      const fix = await getCurrentPosition(6000);
      programmaticMove = true;
      await moveCamera({ coordinate: fix });
    } catch {
      // Silently ignore — the map is still visible at its last position.
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Places search
  // ───────────────────────────────────────────────────────────────────────────

  async function onSearchInput(event: Event & { currentTarget: HTMLInputElement }) {
    queryText = event.currentTarget.value;
    if (!queryText) {
      suggestions = [];
      return;
    }
    if (!sessionToken) {
      sessionToken = await newSessionToken();
    }
    suggestions = await suggestPlaces(queryText, settings.language, sessionToken);
  }

  async function choose(suggestion: PlaceSuggestion) {
    queryText = suggestion.description;
    suggestions = [];
    sessionToken = undefined;

    const location = await placeLocation(suggestion.placeId, suggestion.description);
    if (location) {
      programmaticMove = true;
      await moveCamera({ coordinate: location, zoom: 14 });
      // Trigger an immediate search at the chosen location
      if (lastCamera) {
        runSearch({ ...lastCamera, bounds: { center: location, southwest: lastCamera.bounds.southwest } });
      }
    }
  }

  function clearSearch() {
    queryText = '';
    suggestions = [];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ───────────────────────────────────────────────────────────────────────────

  onMount(() => {
    // Android: the native map renders beneath the webview, so every layer
    // above it must be transparent or the map is invisible.
    if (isAndroid()) {
      document.body.classList.add('map-underlay');
    }
    start();
  });

  onDestroy(async () => {
    if (isAndroid()) {
      document.body.classList.remove('map-underlay');
    }
    await teardown();
  });
</script>

<svelte:head><title>{t('MAP_SEARCH')}</title></svelte:head>

{#if !hasKey}
  <div class="flex h-full flex-col items-center justify-center gap-3 px-8 py-20 text-center">
    <MapPin class="h-12 w-12 text-[var(--text-muted)]" />
    <p class="text-sm text-[var(--text-muted)]">Map not configured — add Google Maps keys to your environment variables.</p>
  </div>
{:else}
  <div class="relative -mb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] w-full flex-1 overflow-hidden">
    <!-- Map container -->
    <capacitor-google-map bind:this={mapElement} id="map" class="block" style="position: absolute; inset: 0; bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px));"></capacitor-google-map>

    <!-- Error state -->
    {#if error}
      <div class="absolute top-20 left-1/2 z-20 -translate-x-1/2 rounded-xl bg-[var(--surface-raised)] px-4 py-3 shadow-md" role="alert">
        <p class="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onclick={() => {
            error = '';
            start();
          }}
          class="mt-1 text-xs text-[var(--text-muted)] underline"
        >
          Retry
        </button>
      </div>
    {/if}

    <!-- Search bar -->
    <div class="absolute top-2 right-2 left-2 z-10">
      <div class="flex items-center gap-2 rounded-xl bg-[var(--surface-raised)] px-3 py-2 shadow-md">
        <Search class="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
        <input type="text" placeholder={t('SEARCH_PLACEHOLDER')} value={queryText} oninput={onSearchInput} class="flex-1 bg-transparent outline-none" aria-label={t('SEARCH_PLACEHOLDER')} />
        {#if queryText}
          <button type="button" onclick={clearSearch} class="shrink-0 rounded-full p-0.5 text-[var(--text-muted)] hover:text-[var(--text)]" aria-label={t('CANCEL')}>
            <X class="h-4 w-4" />
          </button>
        {/if}
      </div>

      <!-- Autocomplete suggestions -->
      {#if suggestions.length > 0}
        <ul role="listbox" aria-label="Place suggestions" class="mt-1 overflow-hidden rounded-xl bg-[var(--surface-raised)] shadow-md">
          {#each suggestions as item, i (i)}
            <li role="option" aria-selected="false">
              <button type="button" onclick={() => choose(item)} class="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[var(--surface-sunken)]">
                <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
                <span class="line-clamp-2 text-sm">{item.description}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- Locate button -->
    <button
      type="button"
      onclick={locateAndRecentre}
      class="absolute top-16 right-3 z-10 rounded-full bg-[var(--surface-raised)] p-2.5 shadow-md hover:bg-[var(--surface-sunken)]"
      aria-label={t('LOCATING')}
    >
      <LocateFixed class="h-5 w-5 text-[#000090] dark:text-blue-400" />
    </button>

    <!-- Search this area button — only shown when zoom is sufficient and the
		     viewport has moved meaningfully since the last search -->
    {#if canSearchArea}
      <div class="absolute bottom-24 left-1/2 z-10 -translate-x-1/2">
        <button type="button" onclick={searchThisArea} class="flex items-center gap-2 rounded-full bg-[var(--surface-raised)] px-4 py-2 text-sm font-medium shadow-md hover:bg-[var(--surface-sunken)]">
          <RotateCw class="h-4 w-4 text-[#000090] dark:text-blue-400" aria-hidden="true" />
          {t('SEARCH_AREA')}
        </button>
      </div>
    {/if}

    <!-- Loading indicator -->
    {#if loading.active}
      <div class="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[var(--surface-raised)] px-4 py-2 shadow-md" role="status" aria-live="polite">
        <span class="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span class="h-3 w-3 animate-spin rounded-full border-2 border-[#000090] border-t-transparent dark:border-blue-400"></span>
          {loading.message || t('FINDING_MTGS')}
        </span>
      </div>
    {/if}

    <!-- Detail sheet loading indicator -->
    {#if detailLoading}
      <div class="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[var(--surface-raised)] px-4 py-2 shadow-md" role="status" aria-live="polite">
        <span class="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span class="h-3 w-3 animate-spin rounded-full border-2 border-[#000090] border-t-transparent dark:border-blue-400"></span>
          {t('FINDING_MTGS')}
        </span>
      </div>
    {/if}
  </div>

  <!-- Detail sheet -->
  {#if detailOpen}
    <MeetingDetail meetings={detailMeetings} formatNames={detailFormats} onClose={closeDetail} />
  {/if}
{/if}
