<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { getCleanTime, getCleanTimeTag, getMilestoneProgress } from '$lib/meetings/cleantime.js';
  import Calendar from '@lucide/svelte/icons/calendar';
  import Award from '@lucide/svelte/icons/award';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import X from '@lucide/svelte/icons/x';

  $effect(() => {
    pageTitle.value = t('DATETIME');
  });

  // ── Today (UTC midnight, recomputed once on mount) ────────────────────────

  // We use UTC-midnight Dates throughout so arithmetic is not affected by the
  // local timezone offset — same approach as the test helpers.
  function todayUtc(): Date {
    const n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  }

  const today = todayUtc();

  // Max date for the <input type="date"> — today in YYYY-MM-DD.
  const todayIso = today.toISOString().slice(0, 10);

  // ── Date input — bound to settings.cleanDate (string | null) ─────────────

  // The input's value is a string ('YYYY-MM-DD') or '' when cleared.
  // We keep it in sync with the settings store so it persists automatically.
  let inputValue = $state(settings.cleanDate ?? '');

  function onDateChange(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    inputValue = val;
    settings.cleanDate = val || null;
  }

  function clearDate() {
    inputValue = '';
    settings.cleanDate = null;
  }

  // ── Derived clean time ────────────────────────────────────────────────────
  // Both cleanTime, cleanTag, and milestoneProgress are $derived from inputValue — NOT seeded in
  // an $effect. See AGENTS.md: "prefer $derived to $effect".

  const cleanDate = $derived(inputValue ? new Date(inputValue + 'T00:00:00Z') : null);

  const cleanTime = $derived(cleanDate ? getCleanTime(cleanDate, today) : null);

  const cleanTag = $derived(cleanDate ? getCleanTimeTag(cleanDate, today) : null);

  const milestoneProgress = $derived(cleanDate ? getMilestoneProgress(cleanDate, today) : null);
</script>

<div class="mx-auto flex max-w-md flex-col gap-5 p-4">
  <!-- Date input -->
  <div class="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-xs">
    <label for="clean-date" class="mb-2.5 flex items-center gap-2 text-xs font-bold tracking-wider text-[var(--text-muted)] uppercase">
      <Calendar class="h-4 w-4 text-[var(--color-bmlt)] dark:text-blue-400" />
      {t('ENTERCLEANDATE')}
    </label>
    <div class="relative flex items-center">
      <input
        id="clean-date"
        type="date"
        max={todayIso}
        value={inputValue}
        onchange={onDateChange}
        class="focusable block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pr-10 pl-4 text-base font-semibold text-[var(--text)] transition-colors hover:border-gray-400 dark:hover:border-gray-500"
      />
      {#if inputValue}
        <button
          type="button"
          onclick={clearDate}
          aria-label="Clear date"
          class="absolute right-3 rounded-full p-1 text-[var(--text-muted)] transition-all hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]"
        >
          <X class="h-5 w-5" />
        </button>
      {/if}
    </div>
  </div>

  <!-- Main Clean Time Dashboard -->
  {#if cleanTime !== null}
    <!-- Hero Box: Total Days -->
    <div
      class="relative flex min-h-[140px] flex-col justify-between overflow-hidden rounded-2xl border border-indigo-950 bg-gradient-to-br from-blue-700 via-indigo-900 to-slate-950 p-6 text-white shadow-md"
    >
      <!-- Background SVG accent pattern for visual appeal -->
      <div class="pointer-events-none absolute -right-10 -bottom-10 text-white/5 select-none">
        <Sparkles class="h-44 w-44" />
      </div>

      <div class="relative z-10">
        <p class="mb-2 text-[11px] font-bold tracking-widest text-indigo-200 uppercase">
          {t('CLEANTIMEINDAYS')}
        </p>
        <p class="text-5xl font-black tracking-tight text-white select-all">
          {cleanTime.totalDays.toLocaleString()}
        </p>
      </div>

      <div class="relative z-10 mt-4 border-t border-white/10 pt-3">
        <p class="text-xs font-medium text-indigo-100">One day at a time. Keep coming back!</p>
      </div>
    </div>

    <!-- Calendar Breakdown Grid -->
    <div class="grid grid-cols-3 gap-3">
      <div class="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-center shadow-xs">
        <p class="text-3xl font-extrabold text-[var(--color-bmlt)] select-all dark:text-blue-400">
          {cleanTime.years}
        </p>
        <p class="mt-1 text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
          {t('YEARS')}
        </p>
      </div>
      <div class="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-center shadow-xs">
        <p class="text-3xl font-extrabold text-[var(--color-bmlt)] select-all dark:text-blue-400">
          {cleanTime.months}
        </p>
        <p class="mt-1 text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
          {t('MONTHS')}
        </p>
      </div>
      <div class="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-center shadow-xs">
        <p class="text-3xl font-extrabold text-[var(--color-bmlt)] select-all dark:text-blue-400">
          {cleanTime.days}
        </p>
        <p class="mt-1 text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
          {t('DAYS')}
        </p>
      </div>
    </div>
  {/if}

  <!-- Keytag Milestone Today Celebration -->
  {#if cleanTag !== null && cleanTag.tag !== 'none'}
    <div class="animate-bounce-subtle relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl border-2 border-amber-400 bg-amber-50/70 p-6 text-center shadow-xs dark:bg-amber-950/20">
      <div class="pointer-events-none absolute -top-4 -right-4 text-amber-400/20">
        <Sparkles class="h-20 w-20" />
      </div>
      <div class="rounded-full bg-amber-100 p-2.5 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
        <Sparkles class="h-6 w-6" />
      </div>
      <div>
        <h3 class="text-xl font-black text-amber-900 dark:text-amber-300">
          {t('BIRTHDAY')}
        </h3>
        <p class="mt-0.5 text-base font-extrabold text-amber-700 dark:text-amber-400">
          {cleanTag.amount}{t(cleanTag.tag)}
        </p>
      </div>
      <div class="relative flex items-center justify-center py-2">
        <div class="absolute inset-0 animate-pulse rounded-full bg-amber-400/20 blur-xl"></div>
        <img src={cleanTag.image} alt="{cleanTag.amount} {t(cleanTag.tag)}" class="relative h-32 w-32 object-contain drop-shadow-md filter" />
      </div>
    </div>
  {/if}

  <!-- Progress Towards Next Milestone -->
  {#if milestoneProgress !== null}
    <div class="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-xs">
      <div class="flex items-center gap-3">
        <div class="shrink-0 rounded-xl bg-blue-50 p-2.5 text-[var(--color-bmlt)] dark:bg-blue-950/40 dark:text-blue-400">
          <Award class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <h3 class="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">Next Milestone</h3>
          <p class="truncate text-sm font-extrabold text-[var(--text)]">
            {milestoneProgress.next.amount}{t(milestoneProgress.next.tag)}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-5">
        {#if milestoneProgress.next.image}
          <img src={milestoneProgress.next.image} alt="{milestoneProgress.next.amount}{t(milestoneProgress.next.tag)}" class="h-20 w-16 shrink-0 object-contain drop-shadow-xs filter" />
        {/if}
        <div class="min-w-0 flex-1">
          <div class="mb-1 flex items-baseline justify-between">
            <span class="text-2xl font-black tracking-tight text-[var(--text)]">
              {milestoneProgress.next.daysRemaining.toLocaleString()}
            </span>
            <span class="text-[11px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
              {milestoneProgress.next.daysRemaining === 1 ? 'day' : 'days'} left
            </span>
          </div>

          <!-- Progress bar -->
          <div class="h-2.5 w-full overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-sunken)]">
            <div
              class="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 dark:from-blue-500 dark:to-indigo-500"
              style="width: {milestoneProgress.next.percent}%"
            ></div>
          </div>
          <div class="mt-1.5 flex justify-between text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
            <span>{milestoneProgress.next.percent}% completed</span>
            <span>Target: {new Date(milestoneProgress.next.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Current Milestone achieved -->
    {#if milestoneProgress.current}
      <div class="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-xs">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
          <img src={milestoneProgress.current.image} alt="Current Milestone" class="h-9 w-9 object-contain drop-shadow-xs filter" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">Current Achievement</p>
          <p class="truncate text-sm font-extrabold text-[var(--text)]">
            {milestoneProgress.current.amount}{t(milestoneProgress.current.tag)} Keytag
          </p>
        </div>
      </div>
    {/if}
  {/if}

  <!-- Welcome screen when no date is entered -->
  {#if cleanTime === null}
    <div class="mt-1 flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-8 text-center shadow-xs">
      <div class="mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-blue-50 text-[var(--color-bmlt)] dark:bg-blue-950/40 dark:text-blue-400">
        <Sparkles class="h-8 w-8" />
      </div>
      <h2 class="mb-2 text-lg font-black tracking-tight text-[var(--text)]">Track Your Recovery Journey</h2>
      <p class="max-w-xs text-sm leading-relaxed text-[var(--text-muted)]">Enter your clean date above to calculate your exact years, months, and days clean, and view your milestone keytags.</p>
    </div>
  {/if}
</div>
