<script lang="ts">
  /**
   * AppBar — top application bar.
   *
   * Covers the status bar area via `safe-top` (env(safe-area-inset-top)).
   * Accepts a `title` prop, an optional `onMenuClick` callback, and an
   * optional `actions` snippet for right-side icon buttons.
   */
  import Menu from '@lucide/svelte/icons/menu';

  interface Props {
    title?: string;
    onMenuClick?: () => void;
    actions?: import('svelte').Snippet;
  }

  const { title = 'NA Ireland', onMenuClick, actions }: Props = $props();
</script>

<header class="safe-top bg-[#000090] text-white shadow-md">
  <div class="flex h-14 items-center gap-2 px-3">
    {#if onMenuClick}
      <button type="button" onclick={onMenuClick} class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20" aria-label="Open menu">
        <Menu size={22} />
      </button>
    {/if}
    <span class="flex-1 text-base font-semibold tracking-wide">{title}</span>
    {#if actions}
      <div class="flex items-center gap-1">
        {@render actions()}
      </div>
    {/if}
  </div>
</header>
