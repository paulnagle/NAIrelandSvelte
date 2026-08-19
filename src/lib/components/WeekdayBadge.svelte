<script lang="ts">
  /**
   * WeekdayBadge — coloured day + time range pill.
   *
   * weekday: 1 = Sunday … 7 = Saturday (matches meeting.weekday_tinyint parsed).
   * startTime / endTime: pre-formatted display strings (from getStartTimeDisplay /
   * getEndTime).  The badge maps the weekday to the matching --color-* token from
   * app.css and uses dark text (all tokens are pastel washes).
   */
  import { t } from '$lib/i18n/index.js';

  interface Props {
    weekday: number;
    startTime: string;
    endTime: string;
  }

  const { weekday, startTime, endTime }: Props = $props();

  // i18n key → CSS custom property name, indexed by weekday_tinyint (1-based).
  const DAY_KEYS = ['', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
  const DAY_COLORS = ['', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

  const dayKey = $derived(DAY_KEYS[weekday] || 'SUNDAY');
  const colorVar = $derived(`var(--color-${DAY_COLORS[weekday] || 'sunday'})`);
  const dayName = $derived(t(dayKey));
</script>

<span class="inline-flex flex-wrap items-center gap-1 rounded-full px-3 py-1 text-sm font-bold text-black" style="background-color: {colorVar};">
  {dayName}&nbsp;{startTime} – {endTime}
</span>
