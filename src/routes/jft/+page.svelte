<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import { getJft } from '$lib/api/jft.js';

  type Status = 'loading' | 'loaded' | 'error';

  let status = $state<Status>('loading');
  let content = $state('');

  $effect(() => {
    pageTitle.value = t('JUSTFORTODAY');
  });

  async function load() {
    status = 'loading';
    try {
      content = await getJft();
      status = 'loaded';
    } catch {
      status = 'error';
    }
  }

  load();
</script>

{#if status === 'loading'}
  <div class="flex h-full items-center justify-center py-20">
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-[#000090] border-t-transparent"></div>
  </div>
{:else if status === 'error'}
  <div class="flex flex-col items-center gap-4 px-6 py-20 text-center">
    <p class="text-red-600">
      {t('JUSTFORTODAY')} — could not load. Please check your connection.
    </p>
    <button onclick={load} class="rounded-md bg-[#000090] px-6 py-2 text-white"> Try again </button>
  </div>
{:else}
  <!-- JFT content is fetched from the trusted jftna.org API -->
  <div class="p-3">
    <div class="jft-content selectable rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-sm">
      <!-- eslint-disable svelte/no-at-html-tags -->
      {@html content}
      <!-- eslint-enable svelte/no-at-html-tags -->
    </div>
  </div>
{/if}

<style>
  /*
   * Style the raw HTML returned by jftna.org.
   * The API sends a full <table>-based document; we normalise it into a clean
   * card layout that matches the app's design tokens.
   */

  /* Hide the outer page chrome — <html>, <head>, <body> are inert inside
     {@html}, but the <table> wrapper and copyright row get suppressed visually. */
  :global(.jft-content table) {
    width: 100%;
    border-collapse: collapse;
  }

  :global(.jft-content tr) {
    display: block;
  }

  :global(.jft-content td) {
    display: block;
    padding: 0;
  }

  /* Date heading (h2) */
  :global(.jft-content h2) {
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
  }

  /* Title heading (h1) */
  :global(.jft-content h1) {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text);
    line-height: 1.3;
    margin-bottom: 0.25rem;
    text-align: center;
  }

  /* Page reference line */
  :global(.jft-content td[align='center']:has(+ td[align='left'] i)) {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }

  /* Pull-quote — the 4th <tr> in the table holds the opening italic citation.
     :first-of-type matches every td (each is the only td in its tr), so we
     target the row by position instead. */
  :global(.jft-content tr:nth-child(4) td i) {
    display: block;
    border-left: 3px solid #000090;
    padding: 0.5rem 0.75rem;
    margin: 0.75rem 0;
    font-style: italic;
    color: var(--text-muted);
    background-color: var(--surface-sunken);
    border-radius: 0 0.5rem 0.5rem 0;
    font-size: 0.95rem;
    line-height: 1.6;
  }

  :global(html.dark .jft-content tr:nth-child(4) td i) {
    border-left-color: #60a5fa; /* blue-400 */
  }

  /* Source attribution (e.g. "Basic Text, p. 56") */
  :global(.jft-content td[align='center']:not(:has(h1)):not(:has(h2)):not(:last-child)) {
    font-size: 0.8rem;
    font-style: italic;
    color: var(--text-muted);
    text-align: right;
    margin-bottom: 1rem;
  }

  /* Body text paragraphs */
  :global(.jft-content td[align='left']) {
    font-size: 0.95rem;
    line-height: 1.7;
    color: var(--text);
    margin-bottom: 0.5rem;
  }

  /* "Just for Today:" affirmation — bold lead-in */
  :global(.jft-content td[align='left'] b) {
    color: #000090;
  }

  :global(html.dark .jft-content td[align='left'] b) {
    color: #60a5fa; /* blue-400 */
  }

  /* Copyright footer */
  :global(.jft-content td[align='center']:last-child) {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: center;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  :global(.jft-content td[align='center']:last-child a) {
    color: var(--text-muted);
    text-decoration: none;
  }
</style>
