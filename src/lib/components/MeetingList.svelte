<script lang="ts">
  /**
   * MeetingList — accordion grouped by weekday.
   *
   * Port of meeting-list.component.html / meeting-list.component.ts from
   * NA-Ireland-Ionic-6, rewritten without Ionic components.
   *
   * Key rules observed:
   *  - Grouped list is $derived, never seeded via $effect.
   *  - {#each} blocks are always keyed by index.
   *  - Expanded-day tracking uses SvelteSet so the template stays reactive.
   */
  import { SvelteSet } from 'svelte/reactivity';

  import type { Meeting } from '$lib/meetings/types.js';
  import { groupByWeekday } from '$lib/meetings/list.js';
  import { t } from '$lib/i18n/index.js';
  import MeetingCard from './MeetingCard.svelte';

  interface Props {
    meetings: Meeting[];
    expandAll?: boolean;
    formatNames?: Record<string, string>;
  }

  const { meetings, expandAll = false, formatNames = {} }: Props = $props();

  // ── Derived grouped list ──────────────────────────────────────────────────

  const groups = $derived(groupByWeekday(meetings));

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
</script>

<div class="flex flex-col gap-3">
  <!-- Accordion sections -->
  {#if groups.length === 0}
    <p class="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Nothing found.</p>
  {:else}
    {@const DAY_KEYS = ['', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']}
    {@const DAY_COLORS = ['', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']}
    <div class="flex flex-col gap-2 px-3 py-3">
      {#each groups as group, gi (gi)}
        {@const isToday = group.weekday === todayWeekday}
        {@const isOpen = expanded.has(group.weekday)}
        {@const colorVar = `var(--color-${DAY_COLORS[group.weekday] ?? 'sunday'})`}

        <!-- Day accordion card -->
        <div class="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-sm">
          <!-- Day header button -->
          <button type="button" onclick={() => toggleDay(group.weekday)} class="focusable flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={isOpen}>
            <!-- Weekday colour swatch -->
            <span class="h-8 w-1.5 shrink-0 rounded-full" style="background-color: {colorVar};" aria-hidden="true"></span>

            <span class="flex-1 font-semibold text-[var(--text)]">
              {t(DAY_KEYS[group.weekday] ?? 'SUNDAY')}
              {#if isToday}
                <span class="ml-2 rounded-full bg-[#000090] px-2 py-0.5 text-xs font-semibold text-white dark:bg-blue-500">today</span>
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
            <div class="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--surface-sunken)] p-3">
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
