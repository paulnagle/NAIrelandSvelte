<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import List from '@lucide/svelte/icons/list';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Calendar from '@lucide/svelte/icons/calendar';
  import Phone from '@lucide/svelte/icons/phone';

  // The home screen uses the default app title already shown by the layout,
  // so clear any page-specific title from a previous route.
  pageTitle.value = '';

  const quickLinks = [
    { href: '/list', icon: List, labelKey: 'MEETINGLIST' },
    { href: '/events', icon: Calendar, labelKey: 'POSTS' },
    { href: '/contact', icon: Phone, labelKey: 'CONTACT' },
    { href: '/map', icon: MapPin, labelKey: 'GOOGLE_MAPS' }
  ] as const;
</script>

<div class="flex min-h-full flex-col items-center justify-center gap-6 px-6 py-10">
  <img src="/web_hi_res_512.png" alt="NA Ireland logo" class="w-full max-w-xs" />

  <div class="grid w-full max-w-sm grid-cols-2 gap-4">
    {#each quickLinks as link, i (i)}
      {@const Icon = link.icon}
      <a
        href={link.href}
        class="focusable flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)]
               bg-[var(--surface-raised)] px-4 py-6 text-center font-medium
               text-[var(--text)] shadow-sm transition-colors
               hover:bg-[var(--surface-sunken)] active:bg-[var(--surface-sunken)]"
      >
        <Icon size={32} strokeWidth={1.5} class="text-[#000090] dark:text-blue-400" />
        <span class="text-sm leading-tight">{t(link.labelKey)}</span>
      </a>
    {/each}
  </div>
</div>
