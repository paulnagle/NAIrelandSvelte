<script lang="ts">
  /**
   * MeetingCard — renders a single BMLT meeting record.
   *
   * Port of meeting-card.component.html / meeting-card.component.ts from
   * NA-Ireland-Ionic-6, rewritten without Ionic components.
   *
   * formatNames is a Record<formatId, displayName> supplied by the parent so
   * this component remains free of async calls.
   */
  import { onMount } from 'svelte';
  import { Browser } from '@capacitor/browser';
  import { Share } from '@capacitor/share';

  import type { Meeting } from '$lib/meetings/types.js';
  import { getMeetingKind } from '$lib/meetings/kind.js';
  import { getStartTimeDisplay, getEndTime } from '$lib/meetings/time.js';
  import { formatAddress } from '$lib/meetings/address.js';
  import { explodeFormats } from '$lib/meetings/formats.js';
  import { buildSharePayload } from '$lib/meetings/share.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { t } from '$lib/i18n/index.js';
  import WeekdayBadge from './WeekdayBadge.svelte';

  interface Props {
    meeting: Meeting;
    formatNames?: Record<string, string>;
  }

  const { meeting, formatNames = {} }: Props = $props();

  // ── Derived display values ──────────────────────────────────────────────────

  const kind = $derived(getMeetingKind(meeting));
  const weekday = $derived(parseInt(meeting.weekday_tinyint, 10));
  const startTime = $derived(getStartTimeDisplay(meeting, settings.timeDisplay));
  const endTime = $derived(getEndTime(meeting, settings.timeDisplay));
  const addressLines = $derived(formatAddress(meeting));
  const formatsStr = $derived(explodeFormats(meeting.format_shared_id_list, formatNames));

  // Strip the BMLT field-name prefixes from contact fields.
  const contactPhone = $derived(meeting.contact_phone_1.replace('Tel.#@-@#', '').trim());
  const contactEmail = $derived(meeting.contact_email_1.replace('Email#@-@#', '').trim());

  // Show address block for physical presence meetings.
  const showAddress = $derived(kind === 'inperson' || kind === 'hybrid' || kind === 'tempclosed' || kind === 'tempreplace');

  // Show directions button for any meeting with a physical location.
  // Hybrid meetings always have a venue; temp-replaced meetings do not
  // (they've moved fully online), so tempreplace is excluded.
  const showDirections = $derived(kind === 'inperson' || kind === 'hybrid' || kind === 'tempclosed');

  // Show the "Temporarily Closed" chip.
  const showTempChip = $derived(kind === 'tempclosed' || kind === 'tempreplace');

  // Day name needed for share payload.
  const DAY_KEYS = ['', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
  const dayName = $derived(t(DAY_KEYS[weekday] ?? 'SUNDAY'));

  // ── Share availability (checked once on mount) ────────────────────────────

  let canShare = $state(false);
  onMount(async () => {
    try {
      const result = await Share.canShare();
      canShare = result.value;
    } catch {
      canShare = false;
    }
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  function openMaps() {
    Browser.open({
      url: `https://www.google.com/maps/search/?api=1&query=${meeting.latitude},${meeting.longitude}`
    });
  }

  function openLink(url: string) {
    Browser.open({ url });
  }

  function dialPhone(number: string) {
    Browser.open({ url: `tel:${number}` });
  }

  async function shareMeeting() {
    const payload = buildSharePayload(meeting, dayName, settings.timeDisplay);
    await Share.share({
      title: payload.title,
      text: payload.text,
      url: payload.url,
      dialogTitle: 'Share this meeting'
    });
  }
</script>

<article class="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-sm">
  <!-- Day / time badge -->
  <header class="mb-3">
    <WeekdayBadge {weekday} {startTime} {endTime} />
    {#if showTempChip}
      <span class="ml-2 rounded-full bg-[var(--color-danger)] px-3 py-0.5 text-xs font-semibold text-white">
        {t('TEMP_CLOSED')}
      </span>
    {/if}
  </header>

  <!-- Meeting name -->
  <h2 class="mb-2 text-base font-semibold text-[var(--text)]">{meeting.meeting_name}</h2>

  <!-- Address — only for physically present meeting kinds -->
  {#if showAddress}
    <div class="selectable mb-2 space-y-0.5 text-sm text-[var(--text-muted)]">
      {#each addressLines as line, i (i)}
        <p>{line}</p>
      {/each}
      {#if meeting.location_info}
        <p>{meeting.location_info}</p>
      {/if}
      {#if meeting.comments}
        <p>{meeting.comments}</p>
      {/if}
      {#if meeting.train_lines}
        <p>{t('TRAIN')}: {meeting.train_lines}</p>
      {/if}
      {#if meeting.bus_lines}
        <p>{t('BUS')}: {meeting.bus_lines}</p>
      {/if}
    </div>
  {/if}

  <!-- Virtual additional info -->
  {#if meeting.virtual_meeting_additional_info}
    <p class="selectable mb-2 text-sm text-[var(--text-muted)]">{meeting.virtual_meeting_additional_info}</p>
  {/if}

  <!-- Contact phone / email -->
  {#if contactPhone}
    <p class="selectable mb-1 text-sm text-[var(--text-muted)]">{contactPhone}</p>
  {/if}
  {#if contactEmail}
    <p class="selectable mb-1 text-sm text-[var(--text-muted)]">{contactEmail}</p>
  {/if}

  <!-- Formats -->
  {#if formatsStr}
    <p class="mb-3 text-sm text-[var(--text-muted)]">
      <em>{t('FORMATS')}:</em>
      {formatsStr}
    </p>
  {/if}

  <!-- Action buttons -->
  <div class="flex flex-col gap-2">
    <!-- Directions — in-person / hybrid / temp-closed without a virtual link,
         OR hybrid (which always has a physical location) -->
    {#if showDirections}
      <button type="button" onclick={openMaps} class="focusable flex items-center justify-center gap-2 rounded-lg bg-[var(--color-bmlt)] px-4 py-2 text-sm font-semibold text-white">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
        {t('MAP')}
      </button>
    {/if}

    <!-- Virtual join link -->
    {#if meeting.virtual_meeting_link}
      <button
        type="button"
        onclick={() => openLink(meeting.virtual_meeting_link)}
        class="focusable flex items-center justify-center gap-2 rounded-lg bg-[var(--color-bmlt)] px-4 py-2 text-sm font-semibold text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line
            x1="14"
            y1="1"
            x2="14"
            y2="4"
          />
        </svg>
        {t('VIRTUAL_LINK')}
      </button>
    {/if}

    <!-- Phone dial-in — only shown alongside a virtual link -->
    {#if meeting.virtual_meeting_link && meeting.phone_meeting_number}
      <button
        type="button"
        onclick={() => dialPhone(meeting.phone_meeting_number)}
        class="focusable flex items-center justify-center gap-2 rounded-lg bg-[var(--color-bmlt)] px-4 py-2 text-sm font-semibold text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6 6l1.21-1.21a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
          />
        </svg>
        {t('PHONE_MEETING')}
      </button>
    {/if}

    <!-- Share -->
    {#if canShare}
      <button
        type="button"
        onclick={shareMeeting}
        class="focusable flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-2 text-sm font-semibold text-[var(--text)]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {t('SHARE_MEETING')}
      </button>
    {/if}
  </div>
</article>
