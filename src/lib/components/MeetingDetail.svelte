<script lang="ts">
  /**
   * MeetingDetail — slide-up bottom-sheet panel.
   *
   * Shown when a map marker is tapped or a meeting row is tapped in the list.
   * Accepts one or more co-located meetings and renders each as a MeetingCard.
   * Tapping the backdrop or the close button calls onClose.
   */
  import type { Meeting } from '$lib/meetings/types.js';
  import MeetingCard from './MeetingCard.svelte';

  interface Props {
    meetings: Meeting[];
    formatNames?: Record<string, string>;
    onClose: () => void;
  }

  const { meetings, formatNames = {}, onClose }: Props = $props();
</script>

<!-- Backdrop — aria-hidden so screen readers skip it; keyboard users close via the button -->
<div class="fixed inset-0 z-[60] bg-black/50" onclick={onClose} aria-hidden="true"></div>

<!-- Panel -->
<div role="dialog" aria-modal="true" aria-label="Meeting details" class="fixed right-0 bottom-0 left-0 z-[70] flex max-h-[80dvh] flex-col rounded-t-2xl bg-[var(--surface)] shadow-2xl">
  <!-- Handle + close -->
  <div class="relative flex shrink-0 items-center px-4 pt-3 pb-2">
    <!-- Drag handle — absolutely centred so it doesn't affect the close button position -->
    <button type="button" onclick={onClose} class="absolute left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-[var(--border)]" aria-label="Close"></button>
    <button type="button" onclick={onClose} class="focusable ml-auto rounded-full p-1 text-[var(--text-muted)] hover:text-[var(--text)]" aria-label="Close">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>

  <!-- Scrollable meeting list -->
  <div class="flex-1 overflow-y-auto px-3 pb-6">
    <div class="flex flex-col gap-3">
      {#each meetings as meeting, i (i)}
        <MeetingCard {meeting} {formatNames} />
      {/each}
    </div>
  </div>
</div>
