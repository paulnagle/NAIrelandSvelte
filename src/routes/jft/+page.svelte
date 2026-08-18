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
  <div class="selectable p-4">
    <!-- eslint-disable svelte/no-at-html-tags -->
    {@html content}
    <!-- eslint-enable svelte/no-at-html-tags -->
  </div>
{/if}
