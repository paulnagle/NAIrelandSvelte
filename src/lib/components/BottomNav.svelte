<script lang="ts">
  /**
   * BottomNav — 9-tab navigation strip.
   *
   * Active tab is derived from the current SvelteKit page URL so the highlight
   * is always in sync with the router. Uses $derived, not $effect, to avoid the
   * silent-on-mount bug described in AGENTS.md.
   */
  import { page } from '$app/stores';
  import { t } from '$lib/i18n/index.js';
  import Home from '@lucide/svelte/icons/home';
  import List from '@lucide/svelte/icons/list';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Timer from '@lucide/svelte/icons/timer';
  import Mic from '@lucide/svelte/icons/mic';
  import Calendar from '@lucide/svelte/icons/calendar';
  import Phone from '@lucide/svelte/icons/phone';
  import Settings from '@lucide/svelte/icons/settings';

  const tabs = [
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

  // Derive the active path from the page store so the highlight is reactive.
  const currentPath = $derived($page.url.pathname);

  function isActive(href: string): boolean {
    if (href === '/') return currentPath === '/';
    return currentPath.startsWith(href);
  }
</script>

<!--
  safe-bottom handles the home indicator on iOS / Android gesture nav bar.
  The fixed position keeps the nav pinned while the main content scrolls.
-->
<nav class="safe-bottom fixed right-0 bottom-0 left-0 z-50 border-t border-[var(--border)] bg-[var(--surface-raised)]">
  <ul class="flex h-16 items-stretch">
    {#each tabs as tab, i (i)}
      {@const active = isActive(tab.href)}
      {@const Icon = tab.icon}
      <li class="flex flex-1 items-stretch">
        <a
          href={tab.href}
          class="focusable flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] leading-none transition-colors
						{active ? 'text-[#000090] dark:text-blue-400' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}"
          aria-current={active ? 'page' : undefined}
        >
          <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
          <span>{t(tab.labelKey)}</span>
        </a>
      </li>
    {/each}
  </ul>
</nav>
