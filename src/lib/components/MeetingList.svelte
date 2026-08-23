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

  // Plain Map — only written to, never read reactively; holds refs to each day's wrapper div.
  // The wrapper div is never sticky so its position is always its true natural position,
  // unlike the sticky button whose offsetTop reflects its stuck location.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const wrapperRefs = new Map<number, HTMLDivElement>();

  function registerWrapper(el: HTMLDivElement, weekday: number) {
    wrapperRefs.set(weekday, el);
    return {
      destroy() { wrapperRefs.delete(weekday); }
    };
  }

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
      expanded.clear();
      expanded.add(weekday);
      const wrapper = wrapperRefs.get(weekday);
      if (wrapper) {
        // Two rAFs: first lets Svelte flush the DOM (old day collapses, new day
        // opens), second lets the browser reflow before we measure.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          // Find the scrolling <main class="app-main">.
          let scroller: HTMLElement | null = wrapper.parentElement;
          while (scroller && !scroller.classList.contains('app-main')) {
            scroller = scroller.parentElement;
          }
          if (!scroller) return;
          // getBoundingClientRect gives positions relative to the viewport.
          // The difference between the wrapper's top and the scroller's top,
          // added to the scroller's current scrollTop, gives the absolute
          // scroll position we want — then subtract the 36px back-nav bar.
          const scrollerRect = scroller.getBoundingClientRect();
          const wrapperRect = wrapper.getBoundingClientRect();
          const target = scroller.scrollTop + (wrapperRect.top - scrollerRect.top) - 36;
          scroller.scrollTo({ top: target, behavior: 'smooth' });
        }));
      }
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
      {#each groups as group (group.weekday)}
        {@const isToday = group.weekday === todayWeekday}
        {@const isOpen = expanded.has(group.weekday)}
        {@const colorVar = `var(--color-${DAY_COLORS[group.weekday] ?? 'sunday'})`}

        <!-- Day accordion: header and body are siblings so sticky isn't clipped
             by overflow-hidden. The rounded corners are split between them. -->
        <div use:registerWrapper={group.weekday}>
          <!-- Day header button — sticky below the back-nav bar (top-9 = 36px) -->
          <button
            type="button"
            onclick={() => toggleDay(group.weekday)}
            class="focusable sticky top-9 z-10 flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-left shadow-sm {isOpen ? 'rounded-b-none' : ''}"
            aria-expanded={isOpen}
          >
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
            <div class="flex flex-col gap-3 rounded-b-xl border border-t-0 border-[var(--border)] bg-[var(--surface-sunken)] p-3">
              {#each group.meetings as meeting, i (i)}
                <MeetingCard {meeting} {formatNames} />
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
