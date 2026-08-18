<script lang="ts">
  /**
   * SideDrawer — slide-out navigation drawer.
   *
   * Displays links to all app pages, closes when an item is selected or
   * backdrop is tapped.
   */
  import { page } from '$app/stores';
  import { t } from '$lib/i18n/index.js';
  import X from '@lucide/svelte/icons/x';
  import Home from '@lucide/svelte/icons/home';
  import List from '@lucide/svelte/icons/list';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Timer from '@lucide/svelte/icons/timer';
  import Mic from '@lucide/svelte/icons/mic';
  import Calendar from '@lucide/svelte/icons/calendar';
  import Phone from '@lucide/svelte/icons/phone';
  import Settings from '@lucide/svelte/icons/settings';

  interface Props {
    open: boolean;
    onclose: () => void;
  }

  const { open, onclose }: Props = $props();

  const navItems = [
    { href: '/', icon: Home, labelKey: 'HOME' },
    { href: '/list', icon: List, labelKey: 'MEETINGLIST' },
    { href: '/map', icon: MapPin, labelKey: 'MAP' },
    { href: '/jft', icon: BookOpen, labelKey: 'JUSTFORTODAY' },
    { href: '/cleantime', icon: Timer, labelKey: 'DATETIME' },
    { href: '/speakers', icon: Mic, labelKey: 'SPEAKERS' },
    { href: '/events', icon: Calendar, labelKey: 'POSTS' },
    { href: '/contact', icon: Phone, labelKey: 'CONTACT' },
    { href: '/settings', icon: Settings, labelKey: 'SETTINGS' }
  ] as const;

  const currentPath = $derived($page.url.pathname);

  function isActive(href: string): boolean {
    if (href === '/') return currentPath === '/';
    return currentPath.startsWith(href);
  }
</script>

{#if open}
  <!-- Backdrop -->
  <button type="button" class="fixed inset-0 z-50 bg-black/50 transition-opacity" onclick={onclose} aria-label="Close menu"></button>
{/if}

<!-- Drawer container -->
<aside
  class="safe-top safe-bottom fixed top-0 bottom-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col bg-[var(--surface-raised)] shadow-2xl transition-transform duration-200 ease-in-out"
  class:-translate-x-full={!open}
  class:translate-x-0={open}
  aria-hidden={!open}
>
  <!-- Header -->
  <div class="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[#000090] px-4 text-white">
    <span class="font-semibold tracking-wide">{t('MENU')}</span>
    <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20" onclick={onclose} aria-label="Close menu">
      <X size={20} />
    </button>
  </div>

  <!-- Navigation items -->
  <nav class="flex-1 overflow-y-auto py-2">
    <ul>
      {#each navItems as item, i (i)}
        {@const active = isActive(item.href)}
        {@const Icon = item.icon}
        <li>
          <a
            href={item.href}
            onclick={onclose}
            class="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
              {active ? 'bg-[#000090]/10 text-[#000090] dark:bg-blue-900/30 dark:text-blue-400' : 'text-[var(--text)] hover:bg-[var(--surface)]'}"
          >
            <Icon size={20} class={active ? 'text-[#000090] dark:text-blue-400' : 'text-[var(--text-muted)]'} />
            <span>{t(item.labelKey)}</span>
          </a>
        </li>
      {/each}
    </ul>
  </nav>
</aside>
