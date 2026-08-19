<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import { getPosts, getPostImage } from '$lib/api/wordpress.js';
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

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
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
  <div class="flex flex-col gap-3 p-3">
    {#each posts as post, i (i)}
      {@const imageUrl = getPostImage(post)}
      <article class="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-sm">
        {#if imageUrl}
          <img
            src={imageUrl}
            alt=""
            class="h-48 w-full object-cover"
            loading="lazy"
          />
        {/if}
        <div class="p-4">
          <p class="mb-1 text-xs font-medium text-[var(--text-muted)]">{formatDate(post.date)}</p>
          <h2 class="selectable mb-2 text-base font-semibold text-[#000090]">
            {@html post.title.rendered}
          </h2>
          {#if post.excerpt.rendered.trim()}
            <div class="post-excerpt selectable mb-4 text-sm text-[var(--text-muted)]">
              {@html post.excerpt.rendered}
            </div>
          {/if}
          <button
            type="button"
            onclick={() => openPost(post.link)}
            class="focusable flex items-center gap-2 rounded-lg bg-[#000090] px-4 py-2 text-sm font-semibold text-white active:brightness-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            {t('EVENTS.MOREDETAILS')}
          </button>
        </div>
      </article>
    {/each}
  </div>
  <!-- eslint-enable svelte/no-at-html-tags -->
{/if}

<style>
  /* Strip the <p> margin that WordPress wraps around excerpt text */
  :global(.post-excerpt p) {
    margin: 0;
  }
</style>
