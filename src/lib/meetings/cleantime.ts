/**
 * Cleantime calculator — pure functions, no Svelte, no network.
 *
 * Calendar arithmetic replaces the original's moment-precise-range-plugin
 * and the approximation-based day counts for 6/9/18-month milestones.
 *
 * BUG FIX vs NA-Ireland-Ionic-6:
 *   The original datetime.page.ts detects 6/9/18-month milestones using fixed
 *   day totals (182, 274, 547). These drift: a person with a 31 January clean
 *   date who has been clean for exactly 6 calendar months (31 July) will have
 *   accumulated 181 days in a non-leap year, not 182 — so the milestone fires
 *   a day late. The fix is to compare calendar months directly.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CleanTime {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

export interface CleanTimeTag {
  tag: 'DAYCLEAN' | 'DAYSCLEAN' | 'MONTHSCLEAN' | 'YEARCLEAN' | 'YEARSCLEAN' | 'none';
  amount: number;
  image: string;
}

export interface Milestone {
  tag: 'DAYCLEAN' | 'DAYSCLEAN' | 'MONTHSCLEAN' | 'YEARCLEAN' | 'YEARSCLEAN' | 'none';
  amount: number;
  image: string;
  date: Date;
}

export interface MilestoneProgress {
  current: Milestone | null;
  next: Milestone & {
    daysRemaining: number;
    percent: number;
  };
}

// ---------------------------------------------------------------------------
// getCleanTime
// ---------------------------------------------------------------------------

/**
 * Returns the clean time broken down into years, months, days, and totalDays.
 *
 * Calendar arithmetic:
 *  - years:  full calendar years elapsed (same month+day anniversary has passed)
 *  - months: remaining whole calendar months after subtracting full years
 *  - days:   remaining calendar days after subtracting full years + months
 *  - totalDays: floor((today − cleanDate) / msPerDay)
 *
 * Both `cleanDate` and `today` are treated as UTC midnight (date-only).
 */
export function getCleanTime(cleanDate: Date, today: Date): CleanTime {
  const totalDays = Math.floor((today.getTime() - cleanDate.getTime()) / (1000 * 60 * 60 * 24));

  const cy = today.getFullYear();
  const cm = today.getMonth(); // 0-based
  const cd = today.getDate();

  const sy = cleanDate.getFullYear();
  const sm = cleanDate.getMonth();
  const sd = cleanDate.getDate();

  // Full years: has the anniversary month+day already occurred this year?
  let years = cy - sy;
  if (cm < sm || (cm === sm && cd < sd)) {
    years -= 1;
  }

  // Remaining months after subtracting full years
  const afterYears = new Date(sy + years, sm, sd);
  const ayYear = afterYears.getFullYear();
  const ayMonth = afterYears.getMonth();
  const ayDay = afterYears.getDate();

  let months = cm - ayMonth + (cy - ayYear) * 12;
  // Subtract one month if the day-of-month hasn't been reached yet
  if (cd < ayDay) {
    months -= 1;
  }

  // Remaining days after subtracting full years + months
  const afterMonths = new Date(ayYear, ayMonth + months, ayDay);
  const days = Math.floor((today.getTime() - afterMonths.getTime()) / (1000 * 60 * 60 * 24));

  return { years, months, days, totalDays };
}

// ---------------------------------------------------------------------------
// getCleanTimeTag
// ---------------------------------------------------------------------------

/**
 * Returns the keytag milestone for today, if any.
 *
 * Day-based milestones (1/30/60/90) compare exact totalDays.
 *
 * Month-based milestones (6/9/18) compare same calendar day, N months later
 * — fixing the day-count approximation in the original (182/274/547 days).
 *
 * Year milestones compare exact calendar anniversary (same month and day).
 *
 * Returns tag='none' when today is not a milestone.
 */
export function getCleanTimeTag(cleanDate: Date, today: Date): CleanTimeTag {
  const { totalDays } = getCleanTime(cleanDate, today);

  // ── Day milestones ────────────────────────────────────────────────────────

  if (totalDays === 1) return { tag: 'DAYCLEAN', amount: 1, image: '/keytags/1-day.png' };
  if (totalDays === 30) return { tag: 'DAYSCLEAN', amount: 30, image: '/keytags/30-days.png' };
  if (totalDays === 60) return { tag: 'DAYSCLEAN', amount: 60, image: '/keytags/60-days.png' };
  if (totalDays === 90) return { tag: 'DAYSCLEAN', amount: 90, image: '/keytags/90-days.png' };

  // ── Month milestones (calendar-based, not day-count approximations) ───────

  const sy = cleanDate.getFullYear();
  const sm = cleanDate.getMonth();
  const sd = cleanDate.getDate();

  const ty = today.getFullYear();
  const tm = today.getMonth();
  const td = today.getDate();

  function isExactMonthAnniversary(offsetMonths: number): boolean {
    const target = new Date(sy, sm + offsetMonths, sd);
    return target.getFullYear() === ty && target.getMonth() === tm && target.getDate() === td;
  }

  if (isExactMonthAnniversary(6)) return { tag: 'MONTHSCLEAN', amount: 6, image: '/keytags/6-months.png' };
  if (isExactMonthAnniversary(9)) return { tag: 'MONTHSCLEAN', amount: 9, image: '/keytags/9-months.png' };
  if (isExactMonthAnniversary(18)) return { tag: 'MONTHSCLEAN', amount: 18, image: '/keytags/18-months.png' };

  // ── Year milestones (exact calendar anniversary) ──────────────────────────

  // Only show year tags for full years (not if month/day haven't arrived yet).
  if (tm === sm && td === sd) {
    const years = ty - sy;
    if (years === 1) return { tag: 'YEARCLEAN', amount: 1, image: '/keytags/1-year.png' };
    if (years > 1) return { tag: 'YEARSCLEAN', amount: years, image: '/keytags/x-years.png' };
  }

  return { tag: 'none', amount: 0, image: '' };
}

// ---------------------------------------------------------------------------
// getMilestoneProgress
// ---------------------------------------------------------------------------

/**
 * Calculates the current highest achieved milestone and the next upcoming milestone.
 * Also provides progress indicators (days remaining, percentage elapsed).
 */
export function getMilestoneProgress(cleanDate: Date, today: Date): MilestoneProgress {
  const sy = cleanDate.getFullYear();
  const sm = cleanDate.getMonth();
  const sd = cleanDate.getDate();

  function addDays(d: Date, days: number): Date {
    return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
  }
  function makeUtc(y: number, m: number, d: number): Date {
    return new Date(Date.UTC(y, m, d));
  }

  const list: Milestone[] = [
    { tag: 'DAYCLEAN', amount: 1, image: '/keytags/1-day.png', date: addDays(cleanDate, 1) },
    { tag: 'DAYSCLEAN', amount: 30, image: '/keytags/30-days.png', date: addDays(cleanDate, 30) },
    { tag: 'DAYSCLEAN', amount: 60, image: '/keytags/60-days.png', date: addDays(cleanDate, 60) },
    { tag: 'DAYSCLEAN', amount: 90, image: '/keytags/90-days.png', date: addDays(cleanDate, 90) },
    { tag: 'MONTHSCLEAN', amount: 6, image: '/keytags/6-months.png', date: makeUtc(sy, sm + 6, sd) },
    { tag: 'MONTHSCLEAN', amount: 9, image: '/keytags/9-months.png', date: makeUtc(sy, sm + 9, sd) },
    { tag: 'YEARCLEAN', amount: 1, image: '/keytags/1-year.png', date: makeUtc(sy + 1, sm, sd) },
    { tag: 'MONTHSCLEAN', amount: 18, image: '/keytags/18-months.png', date: makeUtc(sy, sm + 18, sd) }
  ];

  const todayYears = Math.max(0, today.getFullYear() - sy);
  for (let y = 2; y <= todayYears + 2; y++) {
    list.push({
      tag: 'YEARSCLEAN',
      amount: y,
      image: '/keytags/x-years.png',
      date: makeUtc(sy + y, sm, sd)
    });
  }

  // Sort list chronologically
  list.sort((a, b) => a.date.getTime() - b.date.getTime());

  let currentIdx = -1;
  for (let i = 0; i < list.length; i++) {
    if (today.getTime() >= list[i].date.getTime()) {
      currentIdx = i;
    } else {
      break;
    }
  }

  const current = currentIdx >= 0 ? list[currentIdx] : null;
  const next = list[currentIdx + 1];

  const startDate = current ? current.date : cleanDate;
  const intervalTotal = next.date.getTime() - startDate.getTime();
  const intervalElapsed = today.getTime() - startDate.getTime();

  const daysRemaining = Math.max(0, Math.round((next.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const percent = intervalTotal > 0 ? Math.min(100, Math.max(0, Math.floor((intervalElapsed / intervalTotal) * 100))) : 100;

  return {
    current,
    next: {
      ...next,
      daysRemaining,
      percent
    }
  };
}
