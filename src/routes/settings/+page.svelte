<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import { settings } from '$lib/stores/settings.svelte.js';
  import { isIOS } from '$lib/platform.js';

  $effect(() => {
    pageTitle.value = t('SETTINGS');
  });

  const ios = $derived(isIOS());
</script>

<div class="divide-y divide-[var(--border)]">
  <!-- Appearance / theme -->
  <div class="px-4 py-4">
    <p class="mb-3 text-sm font-semibold tracking-wider text-[var(--text-muted)] uppercase">
      {t('THEME')}
    </p>
    <div class="flex gap-3">
      <button
        type="button"
        onclick={() => {
          settings.theme = 'light';
        }}
        class="focusable flex-1 rounded-md border py-2 text-sm font-semibold transition-colors
          {settings.theme === 'light' ? 'border-[#000090] bg-[#000090] text-white' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]'}"
      >
        {t('THEME_LIGHT')}
      </button>
      <button
        type="button"
        onclick={() => {
          settings.theme = 'dark';
        }}
        class="focusable flex-1 rounded-md border py-2 text-sm font-semibold transition-colors
          {settings.theme === 'dark' ? 'border-[#000090] bg-[#000090] text-white' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]'}"
      >
        {t('THEME_DARK')}
      </button>
      <button
        type="button"
        onclick={() => {
          settings.theme = 'system';
        }}
        class="focusable flex-1 rounded-md border py-2 text-sm font-semibold transition-colors
          {settings.theme === 'system' ? 'border-[#000090] bg-[#000090] text-white' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]'}"
      >
        {t('THEME_SYSTEM')}
      </button>
    </div>
  </div>

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

  <!-- Directions app -->
  <div class="px-4 py-4">
    <p class="mb-3 text-sm font-semibold tracking-wider text-[var(--text-muted)] uppercase">
      {t('DIRECTIONS_APP')}
    </p>
    <div class="flex flex-col gap-2">
      <div class="flex gap-3">
        <button
          type="button"
          onclick={() => {
            settings.directionsApp = 'google-maps-web';
          }}
          class="focusable flex-1 rounded-md border py-2 text-sm font-semibold transition-colors
            {settings.directionsApp === 'google-maps-web' ? 'border-[#000090] bg-[#000090] text-white' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]'}"
        >
          {t('DIRECTIONS_GOOGLE_WEB')}
        </button>
        <button
          type="button"
          onclick={() => {
            settings.directionsApp = 'google-maps-app';
          }}
          class="focusable flex-1 rounded-md border py-2 text-sm font-semibold transition-colors
            {settings.directionsApp === 'google-maps-app' ? 'border-[#000090] bg-[#000090] text-white' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]'}"
        >
          {t('DIRECTIONS_GOOGLE_APP')}
        </button>
      </div>
      {#if ios}
        <div class="flex gap-3">
          <button
            type="button"
            onclick={() => {
              settings.directionsApp = 'apple-maps-web';
            }}
            class="focusable flex-1 rounded-md border py-2 text-sm font-semibold transition-colors
              {settings.directionsApp === 'apple-maps-web' ? 'border-[#000090] bg-[#000090] text-white' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]'}"
          >
            {t('DIRECTIONS_APPLE_WEB')}
          </button>
          <button
            type="button"
            onclick={() => {
              settings.directionsApp = 'apple-maps-app';
            }}
            class="focusable flex-1 rounded-md border py-2 text-sm font-semibold transition-colors
              {settings.directionsApp === 'apple-maps-app' ? 'border-[#000090] bg-[#000090] text-white' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]'}"
          >
            {t('DIRECTIONS_APPLE_APP')}
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
