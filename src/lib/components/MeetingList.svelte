<script lang="ts">
  /**
   * MeetingList — accordion grouped by weekday with day-filter chips and an
   * optional hour-range filter.
   *
   * Port of meeting-list.component.html / meeting-list.component.ts from
   * NA-Ireland-Ionic-6, rewritten without Ionic components.
   *
   * Key rules observed:
   *  - Filtered/grouped list is $derived, never seeded via $effect.
   *  - {#each} blocks are always keyed by index.
   *  - Expanded-day tracking uses SvelteSet so the template stays reactive.
   */
  import { SvelteSet } from 'svelte/reactivity';

  import type { Meeting } from '$lib/meetings/types.js';
  import { groupByWeekday, filterByDay, filterByHourRange } from '$lib/meetings/list.js';
  import { t } from '$lib/i18n/index.js';
  import MeetingCard from './MeetingCard.svelte';

  interface Props {
    meetings: Meeting[];
    expandAll?: boolean;
    formatNames?: Record<string, string>;
  }

  const { meetings, expandAll = false, formatNames = {} }: Props = $props();

  // ── Filter state ──────────────────────────────────────────────────────────

  /** null = all days */
  let selectedDay = $state<number | null>(null);
  let hourLower = $state(0);
  let hourUpper = $state(23);

  // ── Derived filtered + grouped list ──────────────────────────────────────

  const filtered = $derived(filterByHourRange(filterByDay(meetings, selectedDay), hourLower, hourUpper));
  const groups = $derived(groupByWeekday(filtered));

  // ── Accordion state ───────────────────────────────────────────────────────

  // Use SvelteSet so the template re-renders when a day is toggled.
  const expanded = new SvelteSet<number>();

  // When expandAll becomes true (or on first render with expandAll=true),
  // open all days present in the current grouped list.
  $effect(() => {
    if (expandAll) {
      for (const g of groups) expanded.add(g.weekday);
    }
  });

  function toggleDay(weekday: number) {
    if (expanded.has(weekday)) {
      expanded.delete(weekday);
    } else {
      expanded.add(weekday);
    }
  }

  // ── Today detection ───────────────────────────────────────────────────────

  // JS getDay() returns 0=Sun … 6=Sat; BMLT weekday_tinyint is 1=Sun … 7=Sat.
  const todayWeekday = new Date().getDay() + 1;

  // ── Day filter chips ──────────────────────────────────────────────────────

  const DAY_CHIPS: { weekday: number | null; key: string }[] = [
    { weekday: null, key: 'ALL' },
    { weekday: 1, key: 'SUNDAY' },
    { weekday: 2, key: 'MONDAY' },
    { weekday: 3, key: 'TUESDAY' },
    { weekday: 4, key: 'WEDNESDAY' },
    { weekday: 5, key: 'THURSDAY' },
    { weekday: 6, key: 'FRIDAY' },
    { weekday: 7, key: 'SATURDAY' }
  ];

  // "ALL" is not in the i18n file — fall back to a sensible default.
  function chipLabel(key: string): string {
    if (key === 'ALL') return 'All';
    return t(key);
  }
</script>

<div class="flex flex-col gap-3">
  <!-- Day filter chips -->
  <div class="flex flex-wrap gap-2 px-4 pt-3">
    {#each DAY_CHIPS as chip, i (i)}
      <button
        type="button"
        onclick={() => {
          selectedDay = chip.weekday;
        }}
        class="focusable rounded-full px-3 py-1 text-xs font-semibold transition-colors
          {selectedDay === chip.weekday ? 'bg-[var(--color-bmlt)] text-white' : 'border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]'}"
      >
        {chipLabel(chip.key)}
      </button>
    {/each}
  </div>

  <!-- Hour range filter -->
  <div class="flex items-center gap-3 px-4 text-sm text-[var(--text-muted)]">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
    <div class="flex flex-1 items-center gap-2">
      <label class="shrink-0" for="hour-lower">{String(hourLower).padStart(2, '0')}:00</label>
      <input id="hour-lower" type="range" min="0" max="23" step="1" bind:value={hourLower} class="focusable flex-1 accent-[var(--color-bmlt)]" />
    </div>
    <span>–</span>
    <div class="flex flex-1 items-center gap-2">
      <label class="shrink-0" for="hour-upper">{String(hourUpper).padStart(2, '0')}:00</label>
      <input id="hour-upper" type="range" min="0" max="23" step="1" bind:value={hourUpper} class="focusable flex-1 accent-[var(--color-bmlt)]" />
    </div>
  </div>

  <!-- Accordion sections -->
  {#if groups.length === 0}
    <p class="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Nothing found.</p>
  {:else}
    {@const DAY_KEYS = ['', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']}
    {@const DAY_COLORS = ['', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']}
    <div class="flex flex-col gap-2 px-3 pb-3">
      {#each groups as group, gi (gi)}
        {@const isToday = group.weekday === todayWeekday}
        {@const isOpen = expanded.has(group.weekday)}
        {@const colorVar = `var(--color-${DAY_COLORS[group.weekday] ?? 'sunday'})`}

        <!-- Day accordion card -->
        <div class="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-sm">
          <!-- Day header button -->
          <button
            type="button"
            onclick={() => toggleDay(group.weekday)}
            class="focusable flex w-full items-center gap-3 px-4 py-3 text-left"
            aria-expanded={isOpen}
          >
            <!-- Weekday colour swatch -->
            <span
              class="h-8 w-1.5 shrink-0 rounded-full"
              style="background-color: {colorVar};"
              aria-hidden="true"
            ></span>

            <span class="flex-1 font-semibold text-[var(--text)]">
              {t(DAY_KEYS[group.weekday] ?? 'SUNDAY')}
              {#if isToday}
                <span class="ml-2 rounded-full bg-[#000090] px-2 py-0.5 text-xs font-semibold text-white">today</span>
              {/if}
            </span>

            <div class="flex items-center gap-2">
              <span class="rounded-full bg-[var(--surface-sunken)] px-2 py-0.5 text-xs font-bold text-[var(--text-muted)]">
                {group.meetings.length}
              </span>
              <!-- Chevron -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform {isOpen ? 'rotate-180' : ''}"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>

          <!-- Meetings for this day -->
          {#if isOpen}
            <div class="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--surface)] p-3">
              {#each group.meetings as meeting, mi (mi)}
                <MeetingCard {meeting} {formatNames} />
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
