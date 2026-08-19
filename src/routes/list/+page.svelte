<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { getAllCounties, getMeetingsByCounty, getFormats } from '$lib/api/bmlt.js';
  import type { Meeting } from '$lib/meetings/types.js';
  import MeetingList from '$lib/components/MeetingList.svelte';

  // ── View state ─────────────────────────────────────────────────────────────

  type View = 'counties' | 'meetings';

  let view = $state<View>('counties');

  // ── County list state ──────────────────────────────────────────────────────

  type CountyStatus = 'loading' | 'loaded' | 'error';

  let countyStatus = $state<CountyStatus>('loading');
  /** Raw API response: all location_sub_province values (including duplicates). */
  let rawCounties = $state<{ location_sub_province: string }[]>([]);

  /**
   * De-duplicated, sorted county list derived from the raw API response.
   * '' maps to 'Online'.
   * AGENTS.md: prefer $derived to $effect — do NOT seed this in an effect.
   */
  const counties = $derived.by(() => {
    // Plain Set — nothing in the template reads this directly; it is immediately
    // converted to an Array and the Array is what $derived exposes.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const seen = new Set<string>();
    for (const row of rawCounties) {
      seen.add(row.location_sub_province);
    }
    return Array.from(seen).sort((a, b) => {
      // Sort '' (Online) after named counties
      if (a === '' && b !== '') return 1;
      if (a !== '' && b === '') return -1;
      return a.localeCompare(b);
    });
  });

  /**
   * Translated display labels for the county list. Depends explicitly on
   * settings.language so the list re-derives when the user switches language —
   * Svelte 5 does not re-render {#each} items whose source array is unchanged.
   */
  const countyLabels = $derived.by(() => {
    void settings.language; // explicit dependency
    return counties.map((c) => ({ key: c, label: c === '' ? t('ONLINE') : t(c) }));
  });

  async function loadCounties() {
    countyStatus = 'loading';
    try {
      rawCounties = await getAllCounties();
      countyStatus = 'loaded';
    } catch {
      countyStatus = 'error';
    }
  }

  loadCounties();

  // ── Meeting list state ─────────────────────────────────────────────────────

  type MeetingStatus = 'loading' | 'loaded' | 'error';

  let meetingStatus = $state<MeetingStatus>('loading');
  let selectedCounty = $state('');
  let meetings = $state<Meeting[]>([]);
  let formatNames = $state<Record<string, string>>({});

  /** Display label for the selected county ('' → localised 'Online'). Re-derives on language change. */
  const countyLabel = $derived.by(() => {
    void settings.language; // explicit dependency so this re-derives when language switches
    return selectedCounty === '' ? t('ONLINE') : t(selectedCounty);
  });

  async function loadMeetings(county: string) {
    selectedCounty = county;
    view = 'meetings';
    meetingStatus = 'loading';
    meetings = [];
    formatNames = {};

    try {
      const fetched = await getMeetingsByCounty(county);
      meetings = fetched as Meeting[];

      // Collect all format IDs across the result set, then resolve names.
      // Plain Set — nothing renders from this; it is passed straight to getFormats().
      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const allIds = new Set<string>();
      for (const m of fetched) {
        for (const id of m.format_shared_id_list.split(',')) {
          const trimmed = id.trim();
          if (trimmed) allIds.add(trimmed);
        }
      }
      if (allIds.size > 0) {
        formatNames = await getFormats(allIds, settings.language);
      }
      meetingStatus = 'loaded';
    } catch {
      meetingStatus = 'error';
    }
  }

  function goBack() {
    view = 'counties';
  }

  // ── Page title ─────────────────────────────────────────────────────────────

  $effect(() => {
    pageTitle.value = view === 'counties' ? t('MEETINGLIST') : countyLabel;
  });
</script>

{#if view === 'counties'}
  <!-- ── County list ─────────────────────────────────────────────────────── -->
  {#if countyStatus === 'loading'}
    <div class="flex h-full items-center justify-center py-20">
      <div class="h-10 w-10 animate-spin rounded-full border-4 border-[#000090] border-t-transparent dark:border-blue-400"></div>
    </div>
  {:else if countyStatus === 'error'}
    <div class="flex flex-col items-center gap-4 px-6 py-20 text-center">
      <p class="text-red-600">{t('MEETINGLIST')} — could not load. Please check your connection.</p>
      <button onclick={loadCounties} class="rounded-md bg-[#000090] px-6 py-2 text-white"> Try again </button>
    </div>
  {:else}
    <div class="flex flex-col gap-2 p-3">
      {#each countyLabels as { key, label }, i (i)}
        <button
          type="button"
          onclick={() => loadMeetings(key)}
          class="focusable flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-left shadow-sm active:brightness-95"
        >
          <!-- Location pin icon -->
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#000090]/10 dark:bg-blue-400/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-[#000090] dark:text-blue-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              {#if key === ''}
                <!-- Video icon for Online -->
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line
                  x1="14"
                  y1="1"
                  x2="14"
                  y2="4"
                />
              {:else}
                <!-- Map pin for counties -->
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              {/if}
            </svg>
          </span>

          <span class="flex-1 text-base font-medium text-[var(--text)]">{label}</span>

          <!-- Chevron right -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 shrink-0 text-[var(--text-muted)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      {/each}
    </div>
  {/if}
{:else}
  <!-- ── Meeting list ─────────────────────────────────────────────────────── -->
  <!-- Back button injected via pageTitle effect; provide inline back row -->
  <div class="flex items-center border-b border-[var(--border)] px-2 py-2">
    <button type="button" onclick={goBack} class="focusable flex items-center gap-1 rounded px-2 py-1 text-sm text-[#000090] dark:text-blue-400" aria-label="Back to county list">
      <!-- Chevron left -->
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {t('MEETINGLIST')}
    </button>
    <span class="ml-2 text-sm font-semibold text-[var(--text)]">{countyLabel}</span>
  </div>

  {#if meetingStatus === 'loading'}
    <div class="flex h-full items-center justify-center py-20">
      <div class="h-10 w-10 animate-spin rounded-full border-4 border-[#000090] border-t-transparent dark:border-blue-400"></div>
    </div>
  {:else if meetingStatus === 'error'}
    <div class="flex flex-col items-center gap-4 px-6 py-20 text-center">
      <p class="text-red-600">{countyLabel} — could not load. Please check your connection.</p>
      <button onclick={() => loadMeetings(selectedCounty)} class="rounded-md bg-[#000090] px-6 py-2 text-white"> Try again </button>
    </div>
  {:else}
    <MeetingList {meetings} {formatNames} />
  {/if}
{/if}
