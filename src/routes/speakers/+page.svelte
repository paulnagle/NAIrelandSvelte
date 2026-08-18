<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import { getConventions } from '$lib/api/speakers.js';
  import type { Convention } from '$lib/api/speakers.js';
  import { Browser } from '@capacitor/browser';

  type Status = 'loading' | 'loaded' | 'error';

  let status = $state<Status>('loading');
  let conventions = $state<Convention[]>([]);

  $effect(() => {
    pageTitle.value = t('SPEAKERS');
  });

  async function load() {
    status = 'loading';
    try {
      const response = await getConventions();
      conventions = response.Conventions;
      status = 'loaded';
    } catch {
      status = 'error';
    }
  }

  load();

  async function openSpeaker(url: string) {
    await Browser.open({ url });
  }
</script>

{#if status === 'loading'}
  <div class="flex h-full items-center justify-center py-20">
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-[#000090] border-t-transparent"></div>
  </div>
{:else if status === 'error'}
  <div class="flex flex-col items-center gap-4 px-6 py-20 text-center">
    <p class="text-red-600">{t('SPEAKERS')} — could not load. Please check your connection.</p>
    <button onclick={load} class="rounded-md bg-[#000090] px-6 py-2 text-white"> Try again </button>
  </div>
{:else}
  <div class="divide-y">
    {#each conventions as convention, i (i)}
      <div class="p-4">
        <h2 class="mb-3 text-base font-semibold text-[#000090]">{convention.convention_name}</h2>
        <div class="flex flex-col gap-2">
          {#each convention.speakers as speaker, j (j)}
            <button onclick={() => openSpeaker(speaker.fileName)} class="rounded-md border border-[#000090] px-4 py-2 text-left text-sm text-[#000090] active:bg-blue-50">
              {speaker.Title}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}
