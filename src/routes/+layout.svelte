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
   */
  import { onMount } from 'svelte';
  import { SplashScreen } from '@capacitor/splash-screen';
  import { isWeb } from '$lib/platform.js';
  import AppBar from '$lib/components/AppBar.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import SideDrawer from '$lib/components/SideDrawer.svelte';
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';

  import '../app.css';

  // Bring the settings store into scope so its reactive state
  // is registered in the root component and stays alive for the whole session.
  import '$lib/stores/settings.svelte.js';

  interface Props {
    children: import('svelte').Snippet;
  }

  const { children }: Props = $props();

  let drawerOpen = $state(false);

  onMount(() => {
    // Mark the body when running in a browser so text selection is restored.
    if (isWeb()) {
      document.body.classList.add('is-web');
    }

    // Hide the native splash screen. On web this is a no-op.
    SplashScreen.hide();
  });

  // The page title is reactive: uses the current page's title when set,
  // otherwise falls back to the app name. Re-evaluates on language change.
  const appTitle = $derived(pageTitle.value || t('HOME_TITLE'));
</script>

<svelte:head>
  <title>{appTitle}</title>
</svelte:head>

<div class="app-shell flex min-h-dvh flex-col">
  <div class="sticky top-0 z-40">
    <AppBar title={appTitle} onMenuClick={() => (drawerOpen = true)} />
  </div>
  <SideDrawer open={drawerOpen} onclose={() => (drawerOpen = false)} />

  <main class="app-main flex flex-1 flex-col overflow-y-auto">
    {@render children()}
  </main>

  <BottomNav />
</div>
