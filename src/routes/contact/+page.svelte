<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import { getServiceGroups } from '$lib/api/bmlt.js';
  import type { ServiceGroup } from '$lib/api/bmlt.js';
  import { Browser } from '@capacitor/browser';
  import Globe from '@lucide/svelte/icons/globe';
  import Phone from '@lucide/svelte/icons/phone';
  import Mail from '@lucide/svelte/icons/mail';
  import ExternalLink from '@lucide/svelte/icons/external-link';

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
      url: 'https://na-ireland.org/'
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
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-[#000090] border-t-transparent dark:border-blue-400"></div>
  </div>
{:else if status === 'error'}
  <div class="flex flex-col items-center gap-4 px-6 py-20 text-center">
    <p class="text-[var(--color-danger)]">{t('CONTACT')} — could not load. Please check your connection.</p>
    <button onclick={load} class="focusable rounded-md bg-[#000090] px-6 py-2 text-white">
      {t('RETRY')}
    </button>
  </div>
{:else}
  <div class="space-y-6 px-4 py-4">
    <!-- Service group cards -->
    <section>
      <p class="mb-3 text-sm font-semibold tracking-wider text-[var(--text-muted)] uppercase">
        {t('CONTACT.DETAILS')}
      </p>
      <div class="space-y-3">
        {#each groups as group (group.id)}
          <div class="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <h2 class="mb-1 text-base font-semibold text-[#000090] dark:text-blue-400">{group.name}</h2>

            {#if group.description}
              <p class="selectable mb-3 text-sm text-[var(--text-muted)]">{group.description}</p>
            {/if}

            <div class="space-y-2">
              {#if group.url}
                <button onclick={() => openUrl(group.url)} class="focusable flex items-center gap-2 text-sm text-[#000090] dark:text-blue-400">
                  <Globe size={15} strokeWidth={1.75} />
                  <span class="underline underline-offset-2">{group.url}</span>
                </button>
              {/if}

              {#if group.helpline}
                <a href="tel:{group.helpline}" class="selectable focusable flex items-center gap-2 text-sm text-[#000090] dark:text-blue-400">
                  <Phone size={15} strokeWidth={1.75} />
                  <span class="underline underline-offset-2">{group.helpline}</span>
                </a>
              {/if}

              {#if group.contact_email}
                <a href="mailto:{group.contact_email}" class="selectable focusable flex items-center gap-2 text-sm text-[#000090] dark:text-blue-400">
                  <Mail size={15} strokeWidth={1.75} />
                  <span class="underline underline-offset-2">{group.contact_email}</span>
                </a>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- App details -->
    <section>
      <p class="mb-3 text-sm font-semibold tracking-wider text-[var(--text-muted)] uppercase">
        {t('CONTACT.APPDETAILS')}
      </p>
      <div class="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]">
        <div class="divide-y divide-[var(--border)]">
          {#each APP_LINKS as link, i (i)}
            <button onclick={() => openUrl(link.url)} class="focusable flex w-full items-center justify-between px-4 py-3 text-left active:bg-[var(--surface-sunken)]">
              <span class="text-sm text-[var(--text)]">{t(link.key)}</span>
              <ExternalLink size={15} strokeWidth={1.75} class="shrink-0 text-[var(--text-muted)]" />
            </button>
          {/each}
        </div>

        {#if t('CONTACT.NAWSBLURB')}
          <div class="border-t border-[var(--border)] px-4 py-3">
            <p class="text-sm text-[var(--text-muted)]">{t('CONTACT.NAWSBLURB')}</p>
          </div>
        {/if}
      </div>
    </section>
  </div>
{/if}
