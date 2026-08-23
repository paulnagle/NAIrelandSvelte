<script lang="ts">
  /**
   * Root app shell layout.
   *
   * Responsibilities:
   *  - Hides the native splash screen once the shell is mounted.
   *  - Adds `is-web` to <body> when not running in a Capacitor shell so
   *    app.css re-enables text selection (see the body:not(.is-web) rule).
   *  - Renders the persistent header (AppBar) and bottom navigation (BottomNav)
   *    around the page content.
   *  - Applies the `dark` class to <html> based on the user's theme setting.
   *    When set to 'system', follows the OS preference via matchMedia.
   */
  import { onMount } from 'svelte';
  import { SplashScreen } from '@capacitor/splash-screen';
  import { isWeb } from '$lib/platform.js';
  import AppBar from '$lib/components/AppBar.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import SideDrawer from '$lib/components/SideDrawer.svelte';
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';
  import { settings } from '$lib/stores/settings.svelte.js';

  import '../app.css';

  interface Props {
    children: import('svelte').Snippet;
  }

  const { children }: Props = $props();

  let drawerOpen = $state(false);
  let systemDark = $state(false);

  onMount(() => {
    // Mark the body when running in a browser so text selection is restored.
    if (isWeb()) {
      document.body.classList.add('is-web');
    }

    // Hide the native splash screen. On web this is a no-op.
    SplashScreen.hide();

    // Track the OS dark-mode preference for when theme === 'system'.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    systemDark = mq.matches;
    const onMqChange = (e: MediaQueryListEvent) => {
      systemDark = e.matches;
    };
    mq.addEventListener('change', onMqChange);
    return () => mq.removeEventListener('change', onMqChange);
  });

  // Derive whether dark mode should be active from the setting + OS preference.
  const isDark = $derived(settings.theme === 'dark' || (settings.theme === 'system' && systemDark));

  // Apply/remove the `dark` class on <html> whenever the derived value changes.
  $effect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  });

  // The page title is reactive: uses the current page's title when set,
  // otherwise falls back to the app name. Re-evaluates on language change.
  const appTitle = $derived(pageTitle.value || t('HOME_TITLE'));
</script>

<svelte:head>
  <title>{appTitle}</title>
</svelte:head>

<div class="app-shell flex h-dvh flex-col">
  <div class="sticky top-0 z-40">
    <AppBar title={appTitle} onMenuClick={() => (drawerOpen = true)} />
  </div>
  <SideDrawer open={drawerOpen} onclose={() => (drawerOpen = false)} />

  <main class="app-main flex flex-1 flex-col overflow-y-auto">
    {@render children()}
  </main>

  <BottomNav />
</div>
