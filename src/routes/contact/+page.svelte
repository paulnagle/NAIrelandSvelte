<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import { getServiceGroups } from '$lib/api/bmlt.js';
  import type { ServiceGroup } from '$lib/api/bmlt.js';
  import { Browser } from '@capacitor/browser';

  type Status = 'loading' | 'loaded' | 'error';

  let status = $state<Status>('loading');
  let groups = $state<ServiceGroup[]>([]);

  $effect(() => {
    pageTitle.value = t('CONTACT');
  });

  async function load() {
    status = 'loading';
    try {
      groups = await getServiceGroups();
      status = 'loaded';
    } catch {
      status = 'error';
    }
  }

  load();

  async function openUrl(url: string) {
    await Browser.open({ url });
  }

  const APP_LINKS = [
    {
      key: 'CONTACT.APPSOURCE',
      url: 'https://github.com/paulnagle/NAIrelandSvelte'
    },
    {
      key: 'CONTACT.REPORTBUG',
      url: 'https://github.com/paulnagle/NAIrelandSvelte/issues'
    },
    {
      key: 'CONTACT.JOINFACE',
      url: 'https://www.facebook.com/groups/bmltusers'
    },
    {
      key: 'CONTACT.VISITWEB',
      url: 'https://bmlt.app'
    },
    {
      key: 'CONTACT.MOREBMLT',
      url: 'https://bmlt.app'
    },
    {
      key: 'CONTACT.NAWSAPP',
      url: 'https://apps.apple.com/app/na-meeting-search/id627946740'
    }
  ] as const;
</script>

{#if status === 'loading'}
  <div class="flex h-full items-center justify-center py-20">
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-[#000090] border-t-transparent"></div>
  </div>
{:else if status === 'error'}
  <div class="flex flex-col items-center gap-4 px-6 py-20 text-center">
    <p class="text-red-600">{t('CONTACT')} — could not load. Please check your connection.</p>
    <button onclick={load} class="rounded-md bg-[#000090] px-6 py-2 text-white"> Try again </button>
  </div>
{:else}
  <div class="divide-y">
    <!-- Service group cards -->
    <div class="px-4 pt-4 pb-2">
      <h2 class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
        {t('CONTACT.DETAILS')}
      </h2>
    </div>

    {#each groups as group, i (i)}
      <div class="p-4">
        <h3 class="mb-1 text-base font-semibold text-[#000090]">{group.name}</h3>

        {#if group.description}
          <p class="selectable mb-2 text-sm text-gray-700">{group.description}</p>
        {/if}

        {#if group.url}
          <button onclick={() => openUrl(group.url)} class="mb-1 block text-sm text-[#000090] underline">
            {group.url}
          </button>
        {/if}

        {#if group.helpline}
          <a href="tel:{group.helpline}" class="selectable mb-1 block text-sm text-[#000090] underline">
            {group.helpline}
          </a>
        {/if}
      </div>
    {/each}

    <!-- Static app details section -->
    <div class="px-4 pt-4 pb-2">
      <h2 class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
        {t('CONTACT.APPDETAILS')}
      </h2>
    </div>

    {#each APP_LINKS as link, i (i)}
      <div class="px-4 py-3">
        <button onclick={() => openUrl(link.url)} class="text-left text-sm text-[#000090] underline">
          {t(link.key)}
        </button>
      </div>
    {/each}

    {#if t('CONTACT.NAWSBLURB')}
      <div class="px-4 py-3">
        <p class="text-sm text-gray-600">{t('CONTACT.NAWSBLURB')}</p>
      </div>
    {/if}
  </div>
{/if}
