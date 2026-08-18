/**
 * Reactive i18n lookup.
 *
 * `t(key)` is a derived function: it re-evaluates whenever `settings.language`
 * changes, so every translated string in the UI updates without a page refresh.
 *
 * Uses $derived at the call site (see usage note below) so the reactivity chain
 * stays connected. The `t` export itself is a plain function — callers wrap it
 * in $derived where they need a reactive value, e.g.:
 *
 *   const label = $derived(t('HOME'));
 *
 * or inline in a template:
 *
 *   {t('HOME')}
 *
 * When used directly inside a Svelte template, Svelte's fine-grained reactivity
 * will re-evaluate the expression whenever `settings.language` changes because
 * `t` closes over it via the `locales` lookup.
 */

import { settings } from '$lib/stores/settings.svelte.js';
import en from './locales/en.json';
import ie from './locales/ie.json';

const locales: Record<string, Record<string, string>> = { en, ie };

/**
 * Look up a translation key in the currently selected language.
 * Falls back to English if the key is missing in the active locale,
 * and returns the key itself if it is missing from English too.
 */
export function t(key: string): string {
  const locale = locales[settings.language] ?? en;
  return (locale[key] ?? en[key as keyof typeof en] ?? key) as string;
}
