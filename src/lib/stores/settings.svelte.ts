/**
 * Reactive settings state backed by localStorage.
 *
 * All values are read once on module load and written back on every change via
 * $effect. Using $state (not a Svelte store) because the project uses Svelte 5
 * runes exclusively — no `writable`, no `export let`.
 */

type Language = 'en' | 'ie';
type TimeDisplay = '12hr' | '24hr';
type DistanceUnit = 'kms' | 'miles';
export type Theme = 'light' | 'dark' | 'system';

function readString<T extends string>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  const stored = localStorage.getItem(key);
  return stored !== null ? (stored as T) : fallback;
}

function readNullableString(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

class SettingsStore {
  #language = $state<Language>(readString<Language>('language', 'en'));
  #timeDisplay = $state<TimeDisplay>(readString<TimeDisplay>('timeDisplay', '12hr'));
  #distanceUnit = $state<DistanceUnit>(readString<DistanceUnit>('distanceUnit', 'kms'));
  #cleanDate = $state<string | null>(readNullableString('cleanDate'));
  #theme = $state<Theme>(readString<Theme>('theme', 'system'));

  get language(): Language {
    return this.#language;
  }

  set language(value: Language) {
    this.#language = value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('language', value);
    }
  }

  get timeDisplay(): TimeDisplay {
    return this.#timeDisplay;
  }

  set timeDisplay(value: TimeDisplay) {
    this.#timeDisplay = value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('timeDisplay', value);
    }
  }

  get distanceUnit(): DistanceUnit {
    return this.#distanceUnit;
  }

  set distanceUnit(value: DistanceUnit) {
    this.#distanceUnit = value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('distanceUnit', value);
    }
  }

  get theme(): Theme {
    return this.#theme;
  }

  set theme(value: Theme) {
    this.#theme = value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', value);
    }
  }

  get cleanDate(): string | null {
    return this.#cleanDate;
  }

  set cleanDate(value: string | null) {
    this.#cleanDate = value;
    if (typeof localStorage !== 'undefined') {
      if (value !== null) {
        localStorage.setItem('cleanDate', value);
      } else {
        localStorage.removeItem('cleanDate');
      }
    }
  }
}

export const settings = new SettingsStore();
