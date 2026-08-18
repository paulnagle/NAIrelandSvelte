<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import { settings } from '$lib/stores/settings.svelte.js';

  $effect(() => {
    pageTitle.value = t('SETTINGS');
  });
</script>

<div class="divide-y divide-[var(--border)]">
  <!-- Language -->
  <div class="px-4 py-4">
    <p class="mb-3 text-sm font-semibold tracking-wider text-[var(--text-muted)] uppercase">
      {t('LANGUAGE')}
    </p>
    <div class="flex gap-3">
      <button
        type="button"
        onclick={() => {
          settings.language = 'en';
        }}
        class="focusable flex-1 rounded-md border py-2 text-sm font-semibold transition-colors
          {settings.language === 'en' ? 'border-[#000090] bg-[#000090] text-white' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]'}"
      >
        {t('ENGLISH')}
      </button>
      <button
        type="button"
        onclick={() => {
          settings.language = 'ie';
        }}
        class="focusable flex-1 rounded-md border py-2 text-sm font-semibold transition-colors
          {settings.language === 'ie' ? 'border-[#000090] bg-[#000090] text-white' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]'}"
      >
        {t('IRISH')}
      </button>
    </div>
  </div>

  <!-- Time display -->
  <div class="px-4 py-4">
    <p class="mb-3 text-sm font-semibold tracking-wider text-[var(--text-muted)] uppercase">
      {t('TIMEDISPLAY')}
    </p>
    <div class="flex gap-3">
      <button
        type="button"
        onclick={() => {
          settings.timeDisplay = '12hr';
        }}
        class="focusable flex-1 rounded-md border py-2 text-sm font-semibold transition-colors
          {settings.timeDisplay === '12hr' ? 'border-[#000090] bg-[#000090] text-white' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]'}"
      >
        {t('12HR')}
      </button>
      <button
        type="button"
        onclick={() => {
          settings.timeDisplay = '24hr';
        }}
        class="focusable flex-1 rounded-md border py-2 text-sm font-semibold transition-colors
          {settings.timeDisplay === '24hr' ? 'border-[#000090] bg-[#000090] text-white' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]'}"
      >
        {t('24HR')}
      </button>
    </div>
  </div>
</div>
