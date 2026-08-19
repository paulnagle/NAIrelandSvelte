<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { getCleanTime, getCleanTimeTag } from '$lib/meetings/cleantime.js';

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

  // ── Derived clean time ────────────────────────────────────────────────────
  // Both cleanTime and cleanTag are $derived from inputValue — NOT seeded in
  // an $effect. See AGENTS.md: "prefer $derived to $effect".

  const cleanDate = $derived(inputValue ? new Date(inputValue + 'T00:00:00Z') : null);

  const cleanTime = $derived(cleanDate ? getCleanTime(cleanDate, today) : null);

  const cleanTag = $derived(cleanDate ? getCleanTimeTag(cleanDate, today) : null);
</script>

<div class="flex flex-col gap-4 p-4">
  <!-- Date input -->
  <div class="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4">
    <label for="clean-date" class="mb-2 block text-sm font-semibold text-[var(--text-muted)]">
      {t('ENTERCLEANDATE')}
    </label>
    <input
      id="clean-date"
      type="date"
      max={todayIso}
      value={inputValue}
      onchange={onDateChange}
      class="focusable w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
    />
  </div>

  <!-- Clean time display -->
  {#if cleanTime !== null}
    <div class="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4">
      <p class="mb-1 text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase">
        {t('CLEANTIMEINDAYS')}
      </p>
      <p class="mb-3 text-2xl font-bold text-[#000090] dark:text-blue-400">{cleanTime.totalDays}</p>

      <div class="flex gap-6 text-center">
        <div class="flex-1">
          <p class="text-2xl font-bold text-[#000090] dark:text-blue-400">{cleanTime.years}</p>
          <p class="text-xs text-[var(--text-muted)]">{t('YEARS')}</p>
        </div>
        <div class="flex-1">
          <p class="text-2xl font-bold text-[#000090] dark:text-blue-400">{cleanTime.months}</p>
          <p class="text-xs text-[var(--text-muted)]">{t('MONTHS')}</p>
        </div>
        <div class="flex-1">
          <p class="text-2xl font-bold text-[#000090] dark:text-blue-400">{cleanTime.days}</p>
          <p class="text-xs text-[var(--text-muted)]">{t('DAYS')}</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Keytag milestone card -->
  {#if cleanTag !== null && cleanTag.tag !== 'none'}
    <div class="flex flex-col items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-center">
      <p class="text-lg font-semibold text-[#000090] dark:text-blue-400">{t('BIRTHDAY')}</p>
      <p class="text-base font-bold text-[#000090] dark:text-blue-400">
        {cleanTag.amount}{t(cleanTag.tag)}
      </p>
      <img src={cleanTag.image} alt="{cleanTag.amount} {t(cleanTag.tag)}" class="h-32 w-32 object-contain" />
    </div>
  {/if}
</div>
