<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import { getPosts } from '$lib/api/wordpress.js';
  import type { WpPost } from '$lib/api/wordpress.js';
  import { Browser } from '@capacitor/browser';

  type Status = 'loading' | 'loaded' | 'error';

  let status = $state<Status>('loading');
  let posts = $state<WpPost[]>([]);

  $effect(() => {
    pageTitle.value = t('POSTS');
  });

  async function load() {
    status = 'loading';
    try {
      posts = await getPosts();
      status = 'loaded';
    } catch {
      status = 'error';
    }
  }

  load();

  async function openPost(url: string) {
    await Browser.open({ url });
  }
</script>

{#if status === 'loading'}
  <div class="flex h-full items-center justify-center py-20">
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-[#000090] border-t-transparent"></div>
  </div>
{:else if status === 'error'}
  <div class="flex flex-col items-center gap-4 px-6 py-20 text-center">
    <p class="text-red-600">{t('POSTS')} — could not load. Please check your connection.</p>
    <button onclick={load} class="rounded-md bg-[#000090] px-6 py-2 text-white"> Try again </button>
  </div>
{:else}
  <!-- WordPress content is from the trusted na-ireland.org API -->
  <!-- eslint-disable svelte/no-at-html-tags -->
  <div class="divide-y">
    {#each posts as post, i (i)}
      <div class="p-4">
        <h2 class="selectable mb-2 text-base font-semibold text-[#000090]">
          {@html post.title.rendered}
        </h2>
        <div class="selectable mb-3 text-sm text-gray-700">
          {@html post.excerpt.rendered}
        </div>
        <button onclick={() => openPost(post.link)} class="rounded-md bg-[#000090] px-4 py-2 text-sm text-white active:bg-blue-900">
          {t('EVENTS.MOREDETAILS')}
        </button>
      </div>
    {/each}
  </div>
  <!-- eslint-enable svelte/no-at-html-tags -->
{/if}
