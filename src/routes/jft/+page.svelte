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

  /* Hard reset: zero every border inside the injected HTML blob. Tailwind 4's
     preflight sets border-style:solid on * which makes any UA-supplied
     border-width render as a visible line. Elements that intentionally have a
     border (pull-quote, copyright) re-declare it with !important below. */
  :global(.jft-content *) {
    border: none !important;
  }

  /* Table markup is replaced with divs by sanitiseJft, so no table UA styles
     can bleed through. These rules target the div equivalents. */
  :global(.jft-content .jft-table) {
    width: 100%;
  }

  /* jftna.org uses <br><br> for spacing between sections; suppress them since
     margins on each element already provide the gaps. */
  :global(.jft-content br) {
    display: none;
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
  /* Page reference line — the div before the pull-quote row */
  :global(.jft-content div[align='center']:has(+ div[align='left'] i)) {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }

  /* Pull-quote — the 4th .jft-row holds the opening italic citation. */
  :global(.jft-content .jft-row:nth-child(4) div i) {
    display: block;
    border-left: 3px solid #000090 !important;
    padding: 0.5rem 0.75rem;
    margin: 0.75rem 0;
    font-style: italic;
    color: var(--text-muted);
    background-color: var(--surface-sunken);
    border-radius: 0 0.5rem 0.5rem 0;
    font-size: 0.95rem;
    line-height: 1.6;
  }

  :global(html.dark .jft-content .jft-row:nth-child(4) div i) {
    border-left-color: #60a5fa !important; /* blue-400 */
  }

  /* Source attribution (e.g. "IP No.19, Self-Acceptance") */
  :global(.jft-content div[align='center']:not(:has(h1)):not(:has(h2)):not(:last-child)) {
    font-size: 0.8rem;
    font-style: italic;
    color: var(--text-muted);
    text-align: right;
    margin-bottom: 1rem;
  }

  /* Body text paragraphs */
  :global(.jft-content div[align='left']) {
    font-size: 0.95rem;
    line-height: 1.7;
    color: var(--text);
    margin-bottom: 0.5rem;
  }

  /* "Just for Today:" affirmation — bold lead-in */
  :global(.jft-content div[align='left'] b) {
    color: #000090;
  }

  :global(html.dark .jft-content div[align='left'] b) {
    color: #60a5fa; /* blue-400 */
  }

  /* Copyright footer — last .jft-row in the table, not last div inside a row */
  :global(.jft-content .jft-row:last-child div) {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: center;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border) !important;
  }

  :global(.jft-content .jft-row:last-child div a) {
    color: var(--text-muted);
    text-decoration: none;
  }
</style>
