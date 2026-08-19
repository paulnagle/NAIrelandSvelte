<script lang="ts">
  /**
   * Map Search Screen
   *
   * Shows a Google Map. Searches for meetings within the visible radius on
   * camera idle. Supports place autocomplete and opens a MeetingDetail panel on
   * marker tap.
   *
   * IMPORTANT — three Capacitor plugin pitfalls (see AGENTS.md):
   *
   * 1. Android: the map renders BENEATH the webview. html.map-underlay in
   *    app.css makes the app-shell/body/html transparent so the native view
   *    shows through. Every element above the map must have an opaque background.
   *
   * 2. iOS: GoogleMap.create() resolving does NOT mean the map exists. We must
   *    await customElements.whenDefined(), two animation frames, THEN create().
   *    Import @capacitor/google-maps EAGERLY (top-level) so the custom element
   *    is defined before Svelte inserts it.
   *
   * 3. setCamera force-unwraps the native map view. NEVER call setCamera before
   *    the map has emitted at least one cameraIdle event. All camera moves go
   *    through moveCamera() which queues and replays.
   */

  // Eagerly imported so the <capacitor-google-map> custom element is defined
  // before Svelte inserts it into the DOM. A lazy import() leaves the element
  // unupgraded and the map blank until navigation away and back.
  import { GoogleMap } from '@capacitor/google-maps';
  import type { CameraIdleCallbackData } from '@capacitor/google-maps/dist/typings/definitions';
  import { Geolocation } from '@capacitor/geolocation';
  import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
  import type { Cluster, Renderer, ClusterStats } from '@googlemaps/markerclusterer';
  import { onMount, onDestroy } from 'svelte';
  import { t } from '$lib/i18n/index.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import { isNative, isAndroid, isIOS, isWeb } from '$lib/platform.js';
  import { platformKey } from '$lib/maps/keys.js';
  import { loadMapsApi } from '$lib/maps/loader.js';
  import { autocompletePlaces, geocodePlace, geocodeAddress as geocodeAddressRest, type PlaceSuggestion } from '$lib/maps/rest.js';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import { getRadiusMeetings, getMeetingsByIds, getFormats } from '$lib/api/bmlt.js';
  import type { Meeting } from '$lib/meetings/types.js';
  import MeetingDetail from '$lib/components/MeetingDetail.svelte';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import LocateFixed from '@lucide/svelte/icons/locate-fixed';
  import X from '@lucide/svelte/icons/x';

  // ── Page title ─────────────────────────────────────────────────────────────

  $effect(() => {
    pageTitle.value = t('GOOGLE_MAPS');
  });

  // ── Key guard ──────────────────────────────────────────────────────────────

  const hasKey = platformKey() !== '';

  // ── State ──────────────────────────────────────────────────────────────────

  /** Native-only: the Capacitor GoogleMap plugin instance. */
  let gmap: GoogleMap | null = null;

  /**
   * Whether the map has emitted its first cameraIdle event.
   * setCamera must NOT be called before this is true — it force-unwraps the
   * native map view and crashes.
   */
  let mapReady = false;

  /**
   * Queued camera move to replay once the map is ready.
   * Necessary because the first GPS fix or place selection may arrive before
   * the map has emitted an event.
   */
  let pendingCamera: { lat: number; lng: number; zoom: number } | null = null;

  /**
   * The camera bounds captured on the last cameraIdle event.
   * Used by searchThisArea() so it always searches the currently visible region.
   */
  let idleBounds: { centerLat: number; centerLng: number; swLat: number; swLng: number } | null = null;

  /** Whether to show the "Search this area" button. True after any camera move. */
  let showSearchHere = $state(false);

  /** Native-only: IDs of currently displayed markers tracked for removal. */
  let currentMarkerIds: string[] = [];

  /**
   * Web-only: the google.maps.Map created directly (not via the plugin).
   * On native, the plugin manages the map; this is always null there.
   */
  let webGoogleMap: google.maps.Map | null = null;

  /**
   * Web-only: the MarkerClusterer that owns all AdvancedMarkerElements.
   * Replaced on every search, null between searches.
   */
  let webMarkerClusterer: MarkerClusterer | null = null;

  /** Whether a search is in progress (shows spinner). */
  let searching = $state(false);

  /** Whether a marker tap is being loaded (shows tap-feedback spinner). */
  let detailLoading = $state(false);

  /** Last full batch of meetings returned by getRadiusMeetings — used to
   *  resolve marker taps locally without a second network request. */
  let lastFetchedMeetings: Meeting[] = [];

  /** Meetings fetched for the open detail panel. */
  let detailMeetings = $state<Meeting[]>([]);
  let detailFormats = $state<Record<string, string>>({});
  let detailOpen = $state(false);

  // ── Autocomplete ───────────────────────────────────────────────────────────

  let searchInput = $state('');
  let suggestions = $state<PlaceSuggestion[]>([]);
  let autocompleteDebounce: ReturnType<typeof setTimeout> | null = null;

  // ── Map creation ───────────────────────────────────────────────────────────

  /**
   * Move the camera to the given coordinates.
   *
   * On native: queues the move if the map isn't ready yet (prevents the
   * setCamera crash on iOS where the native view is not yet initialised).
   * On web: applies immediately via the google.maps.Map JS API.
   */
  function moveCamera(lat: number, lng: number, zoom: number): void {
    if (isWeb()) {
      webGoogleMap?.setCenter({ lat, lng });
      webGoogleMap?.setZoom(zoom);
      return;
    }
    if (!gmap || !mapReady) {
      pendingCamera = { lat, lng, zoom };
      return;
    }
    gmap.setCamera({ coordinate: { lat, lng }, zoom });
  }

  /**
   * Create the map on web using the google.maps.Map JS API directly.
   * This gives us the map instance we need for AdvancedMarkerElement and
   * MarkerClusterer without having to dig into the plugin's internals.
   */
  async function createMapWeb(mapEl: HTMLElement, lat: number, lng: number): Promise<void> {
    // 'maps' and 'marker' are already loaded by loadMapsApi() in onMount.
    webGoogleMap = new google.maps.Map(mapEl, {
      center: { lat, lng },
      zoom: 8,
      mapId: 'na_ireland_map' // required for AdvancedMarkerElement
    });

    webGoogleMap.addListener('idle', () => {
      const zoom = webGoogleMap!.getZoom() ?? 8;
      if (zoom <= 7) {
        webGoogleMap!.setZoom(8);
        return;
      }

      const bounds = webGoogleMap!.getBounds();
      if (!bounds) return;
      const center = bounds.getCenter();
      const sw = bounds.getSouthWest();
      idleBounds = { centerLat: center.lat(), centerLng: center.lng(), swLat: sw.lat(), swLng: sw.lng() };

      showSearchHere = true;
    });
  }

  /**
   * Create the map on native using the Capacitor plugin.
   */
  async function createMapNative(mapEl: HTMLElement, lat: number, lng: number): Promise<void> {
    const key = platformKey();

    // iOS: wait for the custom element to be upgraded, then two animation frames
    // before creating the map. A lazy import() would leave the element unupgraded
    // and the map blank until navigation away and back.
    if (isIOS()) {
      await customElements.whenDefined('capacitor-google-map');
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    }

    gmap = await GoogleMap.create({
      id: 'google-map',
      element: mapEl,
      apiKey: key,
      forceCreate: true,
      config: { center: { lat, lng }, zoom: 8 }
    });

    gmap.setOnCameraIdleListener((event: CameraIdleCallbackData) => {
      // First idle event confirms the map view exists and is safe to call setCamera on.
      if (!mapReady) {
        mapReady = true;
        // Replay any camera move that arrived before the map was ready.
        if (pendingCamera) {
          const p = pendingCamera;
          pendingCamera = null;
          gmap?.setCamera({ coordinate: { lat: p.lat, lng: p.lng }, zoom: p.zoom });
        }
      }

      if (event.zoom <= 7) {
        gmap?.setCamera({ zoom: 8 });
        return;
      }

      const center = event.bounds.center;
      const sw = event.bounds.southwest;
      idleBounds = { centerLat: center.lat, centerLng: center.lng, swLat: sw.lat, swLng: sw.lng };

      showSearchHere = true;
    });

    gmap.setOnMarkerClickListener((event) => {
      openDetail(event.title ?? '');
    });
  }

  async function createMap(lat: number, lng: number): Promise<void> {
    const mapEl = document.getElementById('map') as HTMLElement | null;
    if (!mapEl) return;

    if (isWeb()) {
      await createMapWeb(mapEl, lat, lng);
    } else {
      await createMapNative(mapEl, lat, lng);
    }
  }

  // ── Meeting search ─────────────────────────────────────────────────────────

  /** Called by the "Search this area" button and by programmatic moves with intent. */
  function searchThisArea(): void {
    if (!idleBounds) return;
    showSearchHere = false;
    const { centerLat, centerLng, swLat, swLng } = idleBounds;
    doGetMeetings(centerLat, centerLng, swLat, swLng);
  }

  function doGetMeetings(centerLat: number, centerLng: number, swLat: number, swLng: number): void {
    // Compute search radius from center to SW corner of visible bounds.
    // google.maps is available because loadMapsApi() ran on web, or because
    // @capacitor/google-maps injects it on native.
    let radiusKm = 20; // sensible fallback if geometry is unavailable
    try {
      const distM = (google.maps.geometry.spherical.computeDistanceBetween as (a: unknown, b: unknown) => number)(new google.maps.LatLng(centerLat, centerLng), new google.maps.LatLng(swLat, swLng));
      radiusKm = Math.ceil(distM / 1000);
    } catch {
      // google.maps.geometry not available yet — use fallback
    }

    searching = true;

    getRadiusMeetings(centerLat, centerLng, radiusKm)
      .then(async (meetings) => {
        lastFetchedMeetings = meetings as Meeting[];
        await removeMarkers();
        await addMarkers(lastFetchedMeetings);

        // Resolve format names for the fetched batch.
        // SvelteSet used here so the svelte/prefer-svelte-reactivity lint rule is satisfied.
        // Nothing renders from this set — it is just an accumulator for format ID deduplication.
        const allIds = new SvelteSet<string>();
        for (const m of lastFetchedMeetings) {
          for (const id of m.format_shared_id_list.split(',')) {
            const trimmed = id.trim();
            if (trimmed) allIds.add(trimmed);
          }
        }
        if (allIds.size > 0) {
          detailFormats = await getFormats(allIds, settings.language);
        }
      })
      .catch((err) => {
        console.error('getRadiusMeetings failed:', err);
      })
      .finally(() => {
        searching = false;
        showSearchHere = false;
      });
  }

  // ── Marker grouping ────────────────────────────────────────────────────────

  /**
   * Group co-located meetings into buckets keyed by rounded lat/lng (~111m).
   * Two meetings at the same venue share one marker; meetingIds carries all IDs.
   */
  function groupMeetings(meetings: Meeting[]): Array<{ lat: number; lng: number; meetingIds: string }> {
    // SvelteMap used so the svelte/prefer-svelte-reactivity lint rule is satisfied.
    // Nothing renders from this map.
    const groups = new SvelteMap<string, Meeting[]>();
    for (const m of meetings) {
      const lat = parseFloat(m.latitude);
      const lng = parseFloat(m.longitude);
      if (isNaN(lat) || isNaN(lng)) continue;
      const key = `${Math.round(lat * 1000)},${Math.round(lng * 1000)}`;
      const bucket = groups.get(key) ?? [];
      bucket.push(m);
      groups.set(key, bucket);
    }
    return Array.from(groups.values()).map((bucket) => ({
      lat: parseFloat(bucket[0].latitude),
      lng: parseFloat(bucket[0].longitude),
      // IDs joined so they can be passed directly to getMeetingsByIds().
      meetingIds: bucket.map((m) => m.id_bigint).join('&meeting_ids[]=')
    }));
  }

  // ── Native marker management ───────────────────────────────────────────────

  async function removeMarkers(): Promise<void> {
    if (isWeb()) {
      removeMarkersWeb();
      return;
    }
    if (!gmap || currentMarkerIds.length === 0) return;
    await gmap.removeMarkers(currentMarkerIds);
    currentMarkerIds = [];
  }

  async function addMarkers(meetings: Meeting[]): Promise<void> {
    if (isWeb()) {
      addMarkersWeb(meetings);
      return;
    }
    if (!gmap || meetings.length === 0) return;

    const groups = groupMeetings(meetings);
    const markerDefs = groups.map(({ lat, lng, meetingIds }) => ({
      coordinate: { lat, lng },
      title: meetingIds,
      // iconUrl skips the plugin's PinElement/glyph path, avoiding deprecation warnings.
      iconUrl: '/marker-blue.png',
      iconSize: { width: 70, height: 84 },
      iconAnchor: { x: 35, y: 84 }
    }));

    const ids = await gmap.addMarkers(markerDefs);
    currentMarkerIds = ids;

    // Enable clustering after markers are added so the clusterer picks them up.
    await gmap.enableClustering(4);
  }

  // ── Web marker management (AdvancedMarkerElement + MarkerClusterer) ────────

  /**
   * Custom renderer: uses marker-blue.png for single-location pins and
   * marker-red.png for clustered pins (count > 1), with a count label.
   * Uses the legacy google.maps.Marker for cluster pins so a text label can
   * be composited on top without needing a DOM element per cluster.
   */
  const webClusterRenderer: Renderer = {
    render(cluster: Cluster, _stats: ClusterStats, map: google.maps.Map): google.maps.marker.AdvancedMarkerElement {
      const { count, position } = cluster;
      const isCluster = count > 1;

      const img = document.createElement('img');
      img.src = isCluster ? '/marker-red.png' : '/marker-blue.png';
      img.width = 70;
      img.height = 84;
      img.style.display = 'block';

      // The count is shown as a solid pill badge above the pin rather than
      // overlaid on the NA logo, so both are clearly readable.
      if (isCluster) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;display:inline-block;text-align:center;';

        const badge = document.createElement('div');
        badge.textContent = String(count);
        badge.style.cssText =
          'display:inline-block;margin-bottom:2px;' +
          'background:#b91c1c;color:#fff;' +
          'font-size:12px;font-weight:700;line-height:1;' +
          'padding:3px 7px;border-radius:999px;' +
          'border:2px solid #fff;' +
          'box-shadow:0 1px 3px rgba(0,0,0,.45);' +
          'pointer-events:none;white-space:nowrap;';

        wrapper.appendChild(badge);
        wrapper.appendChild(img);
        return new google.maps.marker.AdvancedMarkerElement({
          map,
          position,
          content: wrapper,
          zIndex: 1000 + count
        });
      }

      return new google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        content: img,
        zIndex: 1
      });
    }
  };

  function removeMarkersWeb(): void {
    if (webMarkerClusterer) {
      webMarkerClusterer.clearMarkers();
      webMarkerClusterer.setMap(null);
      webMarkerClusterer = null;
    }
  }

  function addMarkersWeb(meetings: Meeting[]): void {
    if (!webGoogleMap || meetings.length === 0) return;

    const groups = groupMeetings(meetings);
    const AdvancedMarkerElement = google.maps.marker.AdvancedMarkerElement;

    const markers = groups.map(({ lat, lng, meetingIds }) => {
      const img = document.createElement('img');
      img.src = '/marker-blue.png';
      img.width = 70;
      img.height = 84;
      img.style.display = 'block';

      const marker = new AdvancedMarkerElement({
        position: { lat, lng },
        content: img,
        zIndex: 1
      });

      marker.addListener('click', () => {
        openDetail(meetingIds);
      });

      return marker;
    });

    webMarkerClusterer = new MarkerClusterer({
      map: webGoogleMap,
      markers,
      algorithm: new SuperClusterAlgorithm({ minPoints: 4 }),
      renderer: webClusterRenderer
    });
  }

  // ── Meeting detail panel ───────────────────────────────────────────────────

  async function openDetail(meetingIds: string): Promise<void> {
    if (!meetingIds) return;

    // Try to resolve meetings from the last fetched batch without a network
    // round-trip. The marker title encodes IDs as "1&meeting_ids[]=2&...", so
    // split on the separator to recover them.
    const ids = meetingIds
      .split('&meeting_ids[]=')
      .map((s) => s.trim())
      .filter(Boolean);
    const cached = lastFetchedMeetings.filter((m) => ids.includes(m.id_bigint));
    if (cached.length > 0) {
      detailMeetings = cached;
      detailOpen = true;
      return;
    }

    // Fallback: fetch from BMLT (e.g. cold open from a deep-link or stale cache).
    detailLoading = true;
    try {
      const meetings = await getMeetingsByIds(meetingIds);
      detailMeetings = meetings as Meeting[];
      detailOpen = true;
    } catch (err) {
      console.error('getMeetingsByIds failed:', err);
    } finally {
      detailLoading = false;
    }
  }

  function closeDetail(): void {
    detailOpen = false;
    detailMeetings = [];
  }

  // ── Locate me ──────────────────────────────────────────────────────────────

  /** Shown when locateMe fails — cleared after 3 s. */
  let locationError = $state(false);

  async function locateMe(): Promise<void> {
    try {
      const pos = await Geolocation.getCurrentPosition();
      moveCamera(pos.coords.latitude, pos.coords.longitude, 10);
    } catch (err) {
      console.error('Geolocation failed:', err);
      locationError = true;
      setTimeout(() => {
        locationError = false;
      }, 3000);
    }
  }

  // ── Autocomplete ───────────────────────────────────────────────────────────

  function onSearchInput(): void {
    if (autocompleteDebounce) clearTimeout(autocompleteDebounce);
    const value = searchInput;

    if (!value) {
      suggestions = [];
      return;
    }

    autocompleteDebounce = setTimeout(async () => {
      if (isNative()) {
        suggestions = await autocompletePlaces(value, settings.language);
      } else {
        // Web path: use the JS SDK AutocompleteSuggestion API.
        suggestions = await fetchWebSuggestions(value);
      }
    }, 250);
  }

  async function fetchWebSuggestions(input: string): Promise<PlaceSuggestion[]> {
    try {
      await loadMapsApi();
      const { AutocompleteSuggestion } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
      const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        language: settings.language
      });
      if (!response?.suggestions) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return response.suggestions.map((s: any) => ({
        description: s.placePrediction?.text?.toString() ?? '',
        placeId: s.placePrediction?.placeId ?? ''
      }));
    } catch {
      return [];
    }
  }

  async function selectSuggestion(item: PlaceSuggestion): Promise<void> {
    suggestions = [];
    searchInput = item.description;

    const coords: { lat: number; lng: number } | null = isNative()
      ? ((await geocodePlace(item.placeId)) ?? (await geocodeAddressRest(item.description)))
      : await geocodeWebPlace(item.placeId, item.description);

    if (coords) {
      moveCamera(coords.lat, coords.lng, 10);
    }
  }

  async function geocodeWebPlace(placeId: string, fallbackAddress: string): Promise<{ lat: number; lng: number } | null> {
    try {
      await loadMapsApi();
      const { Place } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
      const place = new Place({ id: placeId });
      await place.fetchFields({ fields: ['location'] });
      if (place?.location) {
        const lat = place.location.lat();
        const lng = place.location.lng();
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
    } catch {
      // Fall through to geocoder fallback
    }

    // Fallback: Geocoding API via JS SDK
    try {
      await loadMapsApi();
      return await new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: fallbackAddress }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
            const loc = results[0].geometry.location;
            resolve({ lat: loc.lat(), lng: loc.lng() });
          } else {
            resolve(null);
          }
        });
      });
    } catch {
      return null;
    }
  }

  function clearSearch(): void {
    searchInput = '';
    suggestions = [];
  }

  // ── Mount / destroy ────────────────────────────────────────────────────────

  onMount(async () => {
    if (!hasKey) return;

    // Android: make the webview transparent so the native map view shows through.
    if (isAndroid()) {
      document.documentElement.classList.add('map-underlay');
    }

    // On web, load the JS SDK first so google.maps is available for autocomplete
    // and geometry computations in the cameraIdle handler.
    if (isWeb()) {
      await loadMapsApi();
    }

    // Start the map immediately at the Dublin default so the user sees a map
    // straight away rather than waiting up to 5 s for GPS. GPS runs in parallel
    // and moves the camera (and triggers the first search) when it resolves.
    const DUBLIN_LAT = 53.3498;
    const DUBLIN_LNG = -6.2603;

    // Fire GPS and map creation concurrently.
    const [, pos] = await Promise.allSettled([createMap(DUBLIN_LAT, DUBLIN_LNG), Geolocation.getCurrentPosition({ timeout: 5000 })]);

    // If GPS resolved, move the camera.
    if (pos.status === 'fulfilled') {
      moveCamera(pos.value.coords.latitude, pos.value.coords.longitude, 10);
    }
  });

  onDestroy(() => {
    if (autocompleteDebounce) clearTimeout(autocompleteDebounce);

    // Remove the Android transparency class so other screens get their backgrounds back.
    document.documentElement.classList.remove('map-underlay');

    // Web: tear down the clusterer; the google.maps.Map is GC'd with the DOM element.
    removeMarkersWeb();
    webGoogleMap = null;

    // Native: destroy the plugin map instance.
    if (gmap) {
      gmap.removeAllMapListeners();
      gmap.destroy();
      gmap = null;
    }
  });
</script>

{#if !hasKey}
  <!-- No key configured — show a friendly message instead of a blank screen -->
  <div class="flex h-full flex-col items-center justify-center gap-3 px-8 py-20 text-center">
    <MapPin class="h-12 w-12 text-[var(--text-muted)]" />
    <p class="text-sm text-[var(--text-muted)]">Map not configured — add Google Maps keys to your environment variables.</p>
  </div>
{:else}
  <!--
    The map fills the available viewport. On Android every element rendered
    above the <capacitor-google-map> must carry an explicit opaque background —
    the app-shell's transparency reveals the native layer beneath. The search
    bar and suggestion list use bg-[var(--surface-raised)] for this purpose.
    The map container itself is transparent (the plugin needs this).
  -->
  <!--
    app-main adds padding-bottom to clear the fixed bottom nav on every page.
    Reclaim that padding with a matching negative margin so the container
    reaches the bottom of the viewport, then stop the map element itself at the
    nav bar top edge (3.5rem h-14 + safe area) so it doesn't draw behind the nav.
  -->
  <div class="relative -mb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] w-full flex-1 overflow-hidden">
    <!-- Map element — must be in the DOM before GoogleMap.create() is called -->
    <capacitor-google-map id="map" style="display: block; position: absolute; inset: 0; bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px)); background: transparent;"></capacitor-google-map>

    <!-- ── Search bar (opaque on Android) ────────────────────────────────── -->
    <div class="absolute top-2 right-2 left-2 z-10">
      <div class="flex items-center gap-2 rounded-xl bg-[var(--surface-raised)] px-3 py-2 shadow-md">
        <MapPin class="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
        <input
          type="text"
          bind:value={searchInput}
          oninput={onSearchInput}
          placeholder={t('FINDING_MTGS')}
          class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
          aria-label="Search for a place"
          autocomplete="off"
        />
        {#if searchInput}
          <button type="button" onclick={clearSearch} class="shrink-0 rounded-full p-0.5 text-[var(--text-muted)] hover:text-[var(--text)]" aria-label="Clear search">
            <X class="h-4 w-4" />
          </button>
        {/if}
        <!-- Locate me button -->
        <button type="button" onclick={locateMe} class="shrink-0 rounded-full p-1 text-[#000090] hover:bg-[var(--surface-sunken)] dark:text-blue-400" aria-label={t('LOCATING')}>
          <LocateFixed class="h-5 w-5" />
        </button>
      </div>

      <!-- ── Autocomplete suggestion list ─────────────────────────────────── -->
      {#if suggestions.length > 0}
        <ul role="listbox" aria-label="Place suggestions" class="mt-1 overflow-hidden rounded-xl bg-[var(--surface-raised)] shadow-md">
          {#each suggestions as item, i (i)}
            <li role="option" aria-selected="false">
              <button
                type="button"
                onclick={() => selectSuggestion(item)}
                class="focusable flex w-full items-start gap-2 px-4 py-3 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-sunken)] active:bg-[var(--surface-sunken)]"
              >
                <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
                <span class="line-clamp-2">{item.description}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- ── Search this area button ──────────────────────────────────────── -->
    {#if showSearchHere && !searching}
      <div class="absolute top-16 left-1/2 z-10 -translate-x-1/2">
        <button
          type="button"
          onclick={searchThisArea}
          class="flex items-center gap-2 rounded-full bg-[var(--surface-raised)] px-4 py-2 text-sm font-medium text-[var(--text)] shadow-md active:bg-[var(--surface-sunken)]"
        >
          <MapPin class="h-4 w-4 shrink-0 text-[#000090] dark:text-blue-400" aria-hidden="true" />
          {t('SEARCH_THIS_AREA')}
        </button>
      </div>
    {/if}

    <!-- ── Searching spinner ─────────────────────────────────────────────── -->
    {#if searching}
      <div class="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[var(--surface-raised)] px-4 py-2 shadow-md" role="status" aria-live="polite">
        <span class="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span class="h-3 w-3 animate-spin rounded-full border-2 border-[#000090] border-t-transparent dark:border-blue-400"></span>
          {t('SEARCHING')}
        </span>
      </div>
    {/if}

    <!-- ── Marker-tap loading indicator ─────────────────────────────────── -->
    {#if detailLoading}
      <div class="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[var(--surface-raised)] px-4 py-2 shadow-md" role="status" aria-live="polite">
        <span class="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span class="h-3 w-3 animate-spin rounded-full border-2 border-[#000090] border-t-transparent dark:border-blue-400"></span>
          {t('FINDING_MTGS')}
        </span>
      </div>
    {/if}

    <!-- ── Location error toast ──────────────────────────────────────────── -->
    {#if locationError}
      <div class="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[var(--surface-raised)] px-4 py-2 shadow-md" role="alert" aria-live="assertive">
        <span class="text-xs text-red-600 dark:text-red-400">{t('LOCATION_ERROR')}</span>
      </div>
    {/if}
  </div>

  <!-- ── Meeting detail panel ──────────────────────────────────────────────── -->
  {#if detailOpen}
    <MeetingDetail meetings={detailMeetings} formatNames={detailFormats} onClose={closeDetail} />
  {/if}
{/if}
