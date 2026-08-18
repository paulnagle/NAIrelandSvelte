<script lang="ts">
  import { t } from '$lib/i18n/index.js';
  import { pageTitle } from '$lib/stores/pageTitle.svelte.js';

  // The home screen uses the default app title already shown by the layout,
  // so clear any page-specific title from a previous route.
  $effect(() => {
    pageTitle.value = '';
  });

  const message = $derived(t('HOME_MESSAGE'));
</script>

<div class="flex min-h-full flex-col items-center justify-center gap-6 px-6 py-10">
  <img src="/web_hi_res_512.png" alt="NA Ireland logo" class="w-full max-w-xs" />
  <p class="text-center text-lg text-gray-600">{message}</p>
</div>
