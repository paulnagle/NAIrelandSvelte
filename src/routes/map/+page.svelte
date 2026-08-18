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

  /** Svelte-managed reference to the GoogleMap instance. */
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
   * One-shot flag. Set to true before camera moves that should trigger a search
   * (GPS fix arrival, place selection). Left false for marker-tap recentering so
   * tapping a pin does not rebuild the very markers the user just tapped.
   */
  let searchAfterMove = true;

  /** Timestamp of the last getMeetings call — used to debounce rapid idle events. */
  let debounceTimestamp = 0;

  /** IDs of currently displayed markers (for removal before the next search). */
  let currentMarkerIds: string[] = [];

  /** Whether a search is in progress (shows spinner). */
  let searching = $state(false);

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
   * If the map is not yet ready (has not emitted a cameraIdle event), the move
   * is queued and replayed when ready — this prevents the setCamera crash on iOS
   * where the native map view is not yet initialised.
   */
  function moveCamera(lat: number, lng: number, zoom: number): void {
    if (!gmap || !mapReady) {
      pendingCamera = { lat, lng, zoom };
      return;
    }
    gmap.setCamera({ coordinate: { lat, lng }, zoom });
  }

  async function createMap(lat: number, lng: number): Promise<void> {
    const mapEl = document.getElementById('map') as HTMLElement | null;
    if (!mapEl) return;

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
      config: {
        center: { lat, lng },
        zoom: 8
      }
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

      if (!searchAfterMove) {
        // Marker tap triggered this idle — skip search so we don't rebuild the
        // pins the user is about to read, and reset the flag for next time.
        searchAfterMove = true;
        return;
      }

      if (event.zoom <= 7) {
        // Too zoomed out — nudge back in without triggering another search.
        searchAfterMove = false;
        gmap?.setCamera({ zoom: 8 });
        return;
      }

      getMeetings(event);
    });

    gmap.setOnMarkerClickListener((event) => {
      // Do NOT search on the camera idle that follows a marker tap: the map
      // recenters on the tapped marker, which would rebuild the pins mid-read.
      searchAfterMove = false;
      openDetail(event.title ?? '');
    });
  }

  // ── Meeting search ─────────────────────────────────────────────────────────

  function getMeetings(event: CameraIdleCallbackData): void {
    const now = Date.now();
    if (debounceTimestamp !== 0 && now - debounceTimestamp < 1000) {
      debounceTimestamp = now;
      return;
    }
    debounceTimestamp = now;

    // Compute search radius from the map bounds.
    // google.maps is available because loadMapsApi() ran on web, or because
    // @capacitor/google-maps injects it on native.
    const center = event.bounds.center;
    const sw = event.bounds.southwest;

    let radiusKm = 20; // sensible fallback if geometry is unavailable
    try {
      const distM = (google.maps.geometry.spherical.computeDistanceBetween as (a: unknown, b: unknown) => number)(
        new google.maps.LatLng(center.lat, center.lng),
        new google.maps.LatLng(sw.lat, sw.lng)
      );
      radiusKm = Math.ceil(distM / 1000);
    } catch {
      // google.maps.geometry not available yet — use fallback
    }

    searching = true;

    getRadiusMeetings(center.lat, center.lng, radiusKm)
      .then(async (meetings) => {
        await removeMarkers();
        await addMarkers(meetings as Meeting[]);

        // Resolve format names for the fetched batch.
        // SvelteSet used here so the svelte/prefer-svelte-reactivity lint rule is satisfied.
        // Nothing renders from this set — it is just an accumulator for format ID deduplication.
        const allIds = new SvelteSet<string>();
        for (const m of meetings) {
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
      });
  }

  // ── Marker management ──────────────────────────────────────────────────────

  async function removeMarkers(): Promise<void> {
    if (!gmap || currentMarkerIds.length === 0) return;
    await gmap.removeMarkers(currentMarkerIds);
    currentMarkerIds = [];
  }

  async function addMarkers(meetings: Meeting[]): Promise<void> {
    if (!gmap || meetings.length === 0) return;

    // Group co-located meetings. Two meetings are co-located when their
    // coordinates match to 3 decimal places (~111m). The original used a
    // sorted list and a do-while loop; we use a Map keyed on a rounded
    // coordinate string so the logic is easier to follow.
    // SvelteMap used here so the svelte/prefer-svelte-reactivity lint rule is satisfied.
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

    const markerDefs = Array.from(groups.values()).map((bucket) => {
      const first = bucket[0];
      const lat = parseFloat(first.latitude);
      const lng = parseFloat(first.longitude);
      // The marker title carries the meeting ID(s). Multiple IDs are joined
      // with '&meeting_ids[]=' so they can be passed directly to getMeetingsByIds().
      const title = bucket.map((m) => m.id_bigint).join('&meeting_ids[]=');
      return {
        coordinate: { lat, lng },
        title
      };
    });

    const ids = await gmap.addMarkers(markerDefs);
    currentMarkerIds = ids;
  }

  // ── Meeting detail panel ───────────────────────────────────────────────────

  async function openDetail(meetingIds: string): Promise<void> {
    if (!meetingIds) return;
    try {
      const meetings = await getMeetingsByIds(meetingIds);
      detailMeetings = meetings as Meeting[];
      detailOpen = true;
    } catch (err) {
      console.error('getMeetingsByIds failed:', err);
    }
  }

  function closeDetail(): void {
    detailOpen = false;
    detailMeetings = [];
  }

  // ── Locate me ──────────────────────────────────────────────────────────────

  async function locateMe(): Promise<void> {
    try {
      const pos = await Geolocation.getCurrentPosition();
      searchAfterMove = true;
      moveCamera(pos.coords.latitude, pos.coords.longitude, 10);
    } catch (err) {
      console.error('Geolocation failed:', err);
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
      searchAfterMove = true;
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

    // Start at Dublin as default; overwrite immediately if GPS succeeds.
    let startLat = 53.3498;
    let startLng = -6.2603;

    try {
      const pos = await Geolocation.getCurrentPosition({ timeout: 5000 });
      startLat = pos.coords.latitude;
      startLng = pos.coords.longitude;
    } catch {
      // GPS unavailable — proceed with Dublin default.
    }

    await createMap(startLat, startLng);
  });

  onDestroy(() => {
    if (autocompleteDebounce) clearTimeout(autocompleteDebounce);

    // Remove the Android transparency class so other screens get their backgrounds back.
    document.documentElement.classList.remove('map-underlay');

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
  <div class="relative h-full w-full overflow-hidden">
    <!-- Map element — must be in the DOM before GoogleMap.create() is called -->
    <capacitor-google-map id="map" style="display: block; width: 100%; height: 100%; background: transparent;"></capacitor-google-map>

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
        <button type="button" onclick={locateMe} class="shrink-0 rounded-full p-1 text-[#000090] hover:bg-[var(--surface-sunken)]" aria-label={t('LOCATING')}>
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

    <!-- ── Searching spinner ─────────────────────────────────────────────── -->
    {#if searching}
      <div class="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[var(--surface-raised)] px-4 py-2 shadow-md" role="status" aria-live="polite">
        <span class="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span class="h-3 w-3 animate-spin rounded-full border-2 border-[#000090] border-t-transparent"></span>
          {t('FINDING_MTGS')}
        </span>
      </div>
    {/if}
  </div>

  <!-- ── Meeting detail panel ──────────────────────────────────────────────── -->
  {#if detailOpen}
    <MeetingDetail meetings={detailMeetings} formatNames={detailFormats} onClose={closeDetail} />
  {/if}
{/if}
