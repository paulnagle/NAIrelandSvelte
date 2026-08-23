<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import { getConventions } from '$lib/api/speakers.js';
  import type { Convention } from '$lib/api/speakers.js';
  import { Browser } from '@capacitor/browser';

  type Status = 'loading' | 'loaded' | 'error';

  let status = $state<Status>('loading');
  let conventions = $state<Convention[]>([]);

  // Use SvelteSet so the template re-renders when a convention is toggled.
  // Keyed by convention_name — stable even if the list order changes.
  const expanded = new SvelteSet<string>();

  // Plain Map — only written to, never read reactively; holds refs to wrapper articles.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const wrapperRefs = new Map<string, HTMLElement>();

  function registerWrapper(el: HTMLElement, name: string) {
    wrapperRefs.set(name, el);
    return { destroy() { wrapperRefs.delete(name); } };
  }

  function toggle(name: string) {
    if (expanded.has(name)) {
      expanded.delete(name);
    } else {
      expanded.clear();
      expanded.add(name);
      const wrapper = wrapperRefs.get(name);
      if (wrapper) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          let scroller: HTMLElement | null = wrapper.parentElement;
          while (scroller && !scroller.classList.contains('app-main')) {
            scroller = scroller.parentElement;
          }
          if (!scroller) return;
          const scrollerRect = scroller.getBoundingClientRect();
          const wrapperRect = wrapper.getBoundingClientRect();
          const target = scroller.scrollTop + (wrapperRect.top - scrollerRect.top);
          scroller.scrollTo({ top: target, behavior: 'smooth' });
        }));
      }
    }
  }

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
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-[#000090] border-t-transparent dark:border-blue-400"></div>
  </div>
{:else if status === 'error'}
  <div class="flex flex-col items-center gap-4 px-6 py-20 text-center">
    <p class="text-red-600">{t('SPEAKERS')} — could not load. Please check your connection.</p>
    <button onclick={load} class="rounded-md bg-[#000090] px-6 py-2 text-white"> Try again </button>
  </div>
{:else}
  <div class="flex flex-col gap-3 p-3">
    {#each conventions as convention (convention.convention_name)}
      {@const isOpen = expanded.has(convention.convention_name)}
      <!-- Wrapper div is never sticky so getBoundingClientRect() is always accurate -->
      <article use:registerWrapper={convention.convention_name}>
        <!-- Convention header — sticky so it stays visible while scrolling the open list -->
        <button
          type="button"
          onclick={() => toggle(convention.convention_name)}
          class="focusable sticky top-0 z-10 flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-left shadow-sm {isOpen ? 'rounded-b-none' : ''}"
          aria-expanded={isOpen}
        >
          <span class="flex-1 text-sm font-semibold text-[var(--text)]">{convention.convention_name}</span>
          <span class="shrink-0 rounded-full bg-[var(--surface-sunken)] px-2 py-0.5 text-xs font-bold text-[var(--text-muted)]">
            {convention.speakers.length}
          </span>
          <!-- Chevron -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform {isOpen ? 'rotate-180' : ''}"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <!-- Speaker rows -->
        {#if isOpen}
          <div class="divide-y divide-[var(--border)] rounded-b-xl border border-t-0 border-[var(--border)]">
            {#each convention.speakers as speaker (speaker.fileName)}
              <button type="button" onclick={() => openSpeaker(speaker.fileName)} class="focusable flex w-full items-center gap-3 px-4 py-3 text-left active:brightness-95">
                <!-- Play icon -->
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#000090]/10 dark:bg-blue-400/20">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[#000090] dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </span>
                <span class="flex-1 text-sm font-medium text-[var(--text)]">{speaker.Title}</span>
              </button>
            {/each}
          </div>
        {/if}
      </article>
    {/each}
  </div>
{/if}
