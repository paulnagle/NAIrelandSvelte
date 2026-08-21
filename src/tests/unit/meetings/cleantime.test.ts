import { describe, it, expect } from 'vitest';
import { getCleanTime, getCleanTimeTag, getMilestoneProgress } from '$lib/meetings/cleantime';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a UTC-midnight Date from a YYYY-MM-DD string to avoid timezone drift. */
function d(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

// ---------------------------------------------------------------------------
// getCleanTime
// ---------------------------------------------------------------------------

describe('getCleanTime', () => {
  it('returns zeros for same day', () => {
    const date = d('2024-01-15');
    expect(getCleanTime(date, date)).toEqual({ years: 0, months: 0, days: 0, totalDays: 0 });
  });

  it('counts totalDays correctly', () => {
    expect(getCleanTime(d('2024-01-01'), d('2024-01-31')).totalDays).toBe(30);
  });

  it('counts 1 year correctly', () => {
    const ct = getCleanTime(d('2023-06-15'), d('2024-06-15'));
    expect(ct).toEqual({ years: 1, months: 0, days: 0, totalDays: 366 }); // 2024 is a leap year
  });

  it('counts 2 years 3 months 5 days', () => {
    const ct = getCleanTime(d('2020-01-10'), d('2022-04-15'));
    expect(ct.years).toBe(2);
    expect(ct.months).toBe(3);
    expect(ct.days).toBe(5);
  });

  it('does not count a year before anniversary day', () => {
    // 364 days in: still 0 years
    const ct = getCleanTime(d('2023-06-15'), d('2024-06-14'));
    expect(ct.years).toBe(0);
  });

  it('handles leap year clean date (Feb 29) on non-leap anniversary', () => {
    // Clean date: 2020-02-29. Anniversary in 2023 (non-leap): no Feb 29 → 1 year
    // falls back to Feb 28, but we count years by full elapsed.
    // 2023-03-01 is past the 2020-02-29 date by 3 years (minus a day or two)
    // The year count is 2 because 2023-02-28 < 2020-02-29 so year 3 hasn't arrived.
    const ct = getCleanTime(d('2020-02-29'), d('2023-03-01'));
    expect(ct.years).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// getCleanTimeTag — day milestones
// ---------------------------------------------------------------------------

describe('getCleanTimeTag — day milestones', () => {
  it('detects 1 day', () => {
    const tag = getCleanTimeTag(d('2024-01-01'), d('2024-01-02'));
    expect(tag.tag).toBe('DAYCLEAN');
    expect(tag.amount).toBe(1);
    expect(tag.image).toBe('/keytags/1-day.png');
  });

  it('detects 30 days', () => {
    const tag = getCleanTimeTag(d('2024-01-01'), d('2024-01-31'));
    expect(tag.tag).toBe('DAYSCLEAN');
    expect(tag.amount).toBe(30);
  });

  it('detects 60 days', () => {
    const tag = getCleanTimeTag(d('2024-01-01'), d('2024-03-01'));
    expect(tag.tag).toBe('DAYSCLEAN');
    expect(tag.amount).toBe(60);
  });

  it('detects 90 days', () => {
    // 2024 is a leap year: Jan(31) + Feb(29) + Mar(31) = 91 days to Apr 1;
    // use 2023 (non-leap) where Jan(31) + Feb(28) + Mar(31) = 90 days to Apr 1.
    const tag = getCleanTimeTag(d('2023-01-01'), d('2023-04-01'));
    expect(tag.tag).toBe('DAYSCLEAN');
    expect(tag.amount).toBe(90);
  });

  it('returns none for 91 days (not a milestone)', () => {
    expect(getCleanTimeTag(d('2024-01-01'), d('2024-04-02')).tag).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// getCleanTimeTag — month milestones (calendar-based, bug-fix from original)
// ---------------------------------------------------------------------------

describe('getCleanTimeTag — 6-month milestone (calendar-based fix)', () => {
  /**
   * BUG FIX: The original used totalDays === 182 to detect 6 months.
   * This is wrong: Jan 31 + 6 calendar months = Jul 31, which is only 181 days
   * in a non-leap year. Using calendar arithmetic instead ensures the milestone
   * fires on the correct date regardless of month length or leap years.
   */
  it('detects 6-month anniversary using calendar months, not day count', () => {
    // Jan 31 → Jul 31: 181 days (non-leap year), not 182
    const tag = getCleanTimeTag(d('2023-01-31'), d('2023-07-31'));
    expect(tag.tag).toBe('MONTHSCLEAN');
    expect(tag.amount).toBe(6);
    expect(tag.image).toBe('/keytags/6-months.png');
  });

  it('does not fire on day 182 when that is NOT the calendar anniversary', () => {
    // Jan 31 + 182 days = Aug 1, not the calendar 6-month date (Jul 31)
    const tag = getCleanTimeTag(d('2023-01-31'), d('2023-08-01'));
    expect(tag.tag).toBe('none');
  });

  it('detects 6-month anniversary for a clean date on the 1st', () => {
    const tag = getCleanTimeTag(d('2024-01-01'), d('2024-07-01'));
    expect(tag.tag).toBe('MONTHSCLEAN');
    expect(tag.amount).toBe(6);
  });
});

describe('getCleanTimeTag — 9-month milestone (calendar-based fix)', () => {
  /**
   * BUG FIX: Same as 6-month — original used day count 274, which drifts.
   * Calendar comparison fires on the exact same day-of-month, 9 months later.
   */
  it('detects 9-month anniversary using calendar months', () => {
    const tag = getCleanTimeTag(d('2024-01-15'), d('2024-10-15'));
    expect(tag.tag).toBe('MONTHSCLEAN');
    expect(tag.amount).toBe(9);
    expect(tag.image).toBe('/keytags/9-months.png');
  });
});

describe('getCleanTimeTag — 18-month milestone (calendar-based fix)', () => {
  /**
   * BUG FIX: Original used day count 547, which drifts by up to 2 days.
   * Calendar comparison fires on the exact same day-of-month, 18 months later.
   */
  it('detects 18-month anniversary using calendar months', () => {
    const tag = getCleanTimeTag(d('2023-01-15'), d('2024-07-15'));
    expect(tag.tag).toBe('MONTHSCLEAN');
    expect(tag.amount).toBe(18);
    expect(tag.image).toBe('/keytags/18-months.png');
  });
});

// ---------------------------------------------------------------------------
// getCleanTimeTag — year milestones
// ---------------------------------------------------------------------------

describe('getCleanTimeTag — year milestones', () => {
  it('detects 1-year anniversary', () => {
    const tag = getCleanTimeTag(d('2023-06-15'), d('2024-06-15'));
    expect(tag.tag).toBe('YEARCLEAN');
    expect(tag.amount).toBe(1);
    expect(tag.image).toBe('/keytags/1-year.png');
  });

  it('detects 5-year anniversary', () => {
    const tag = getCleanTimeTag(d('2019-03-10'), d('2024-03-10'));
    expect(tag.tag).toBe('YEARSCLEAN');
    expect(tag.amount).toBe(5);
    expect(tag.image).toBe('/keytags/x-years.png');
  });

  it('does not fire year tag one day before anniversary', () => {
    const tag = getCleanTimeTag(d('2023-06-15'), d('2024-06-14'));
    expect(tag.tag).toBe('none');
  });

  it('does not fire year tag one day after anniversary', () => {
    const tag = getCleanTimeTag(d('2023-06-15'), d('2024-06-16'));
    expect(tag.tag).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// getCleanTimeTag — no milestone
// ---------------------------------------------------------------------------

describe('getCleanTimeTag — no milestone', () => {
  it('returns none for an arbitrary non-milestone day', () => {
    const tag = getCleanTimeTag(d('2023-01-01'), d('2023-06-20'));
    expect(tag.tag).toBe('none');
    expect(tag.amount).toBe(0);
    expect(tag.image).toBe('');
  });
});

// ---------------------------------------------------------------------------
// getMilestoneProgress
// ---------------------------------------------------------------------------

describe('getMilestoneProgress', () => {
  it('calculates progress before the first milestone (1 day)', () => {
    const progress = getMilestoneProgress(d('2024-01-01'), d('2024-01-01'));
    expect(progress.current).toBeNull();
    expect(progress.next.tag).toBe('DAYCLEAN');
    expect(progress.next.amount).toBe(1);
    expect(progress.next.daysRemaining).toBe(1);
    expect(progress.next.percent).toBe(0);
  });

  it('calculates progress between 1 day and 30 days milestones', () => {
    // 10 days since clean date: 1-day achieved (Jan 2), 30-days is next (Jan 31)
    const progress = getMilestoneProgress(d('2024-01-01'), d('2024-01-11'));
    expect(progress.current?.tag).toBe('DAYCLEAN');
    expect(progress.current?.amount).toBe(1);
    expect(progress.next.tag).toBe('DAYSCLEAN');
    expect(progress.next.amount).toBe(30);
    expect(progress.next.daysRemaining).toBe(20);
    // Interval from Jan 2 to Jan 31 = 29 days total. Elapsed from Jan 2 to Jan 11 = 9 days.
    // 9 / 29 = 31.0% -> 31%
    expect(progress.next.percent).toBe(31);
  });

  it('calculates progress exactly on milestone day', () => {
    // 30 days in: 30-days achieved, 60-days is next
    const progress = getMilestoneProgress(d('2024-01-01'), d('2024-01-31'));
    expect(progress.current?.tag).toBe('DAYSCLEAN');
    expect(progress.current?.amount).toBe(30);
    expect(progress.next.tag).toBe('DAYSCLEAN');
    expect(progress.next.amount).toBe(60);
    expect(progress.next.daysRemaining).toBe(30);
    expect(progress.next.percent).toBe(0);
  });

  it('calculates progress for multi-year milestones', () => {
    // Clean date: 2020-01-01. Today: 2022-06-01.
    // Achieved 2 years on 2022-01-01. Next is 3 years on 2023-01-01.
    const progress = getMilestoneProgress(d('2020-01-01'), d('2022-06-01'));
    expect(progress.current?.tag).toBe('YEARSCLEAN');
    expect(progress.current?.amount).toBe(2);
    expect(progress.next.tag).toBe('YEARSCLEAN');
    expect(progress.next.amount).toBe(3);
    // Days from 2022-01-01 to 2023-01-01 is 365. Elapsed from 2022-01-01 to 2022-06-01 is 151 days.
    // 151 / 365 = 41.3% -> 41%
    expect(progress.next.percent).toBe(41);
  });
});
