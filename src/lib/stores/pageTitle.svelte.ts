/**
 * Reactive page title store.
 *
 * Each page sets `pageTitle.value` to its own translated title. The root
 * layout reads it so the AppBar always shows the current page's title.
 */
export const pageTitle = $state({ value: '' });
