import { describe, it, expect } from 'vitest';
import { parseMinutes, formatTime, getStartTimeDisplay, getEndTime } from '$lib/meetings/time';
import type { Meeting } from '$lib/meetings/types';

// Minimal meeting stub for time functions
function m(start_time: string, duration_time: string): Pick<Meeting, 'start_time' | 'duration_time'> {
  return { start_time, duration_time };
}

describe('parseMinutes', () => {
  it('parses HH:MM:SS correctly', () => {
    expect(parseMinutes('09:30:00')).toBe(570);
  });

  it('parses HH:MM correctly', () => {
    expect(parseMinutes('09:30')).toBe(570);
  });

  it('handles midnight (00:00:00)', () => {
    expect(parseMinutes('00:00:00')).toBe(0);
  });

  it('handles noon (12:00:00)', () => {
    expect(parseMinutes('12:00:00')).toBe(720);
  });

  it('handles 23:59:00', () => {
    expect(parseMinutes('23:59:00')).toBe(1439);
  });

  it('returns 0 for empty string', () => {
    expect(parseMinutes('')).toBe(0);
  });
});

describe('formatTime – 24hr', () => {
  it('formats morning time', () => {
    expect(formatTime(570, '24hr')).toBe('09:30');
  });

  it('formats noon', () => {
    expect(formatTime(720, '24hr')).toBe('12:00');
  });

  it('formats midnight (0 minutes)', () => {
    expect(formatTime(0, '24hr')).toBe('00:00');
  });

  it('formats 23:59', () => {
    expect(formatTime(1439, '24hr')).toBe('23:59');
  });

  it('wraps 1440 minutes back to 00:00', () => {
    expect(formatTime(1440, '24hr')).toBe('00:00');
  });
});

describe('formatTime – 12hr', () => {
  it('formats AM time correctly', () => {
    expect(formatTime(570, '12hr')).toBe('9:30 am');
  });

  it('formats noon as 12:00 pm', () => {
    expect(formatTime(720, '12hr')).toBe('12:00 pm');
  });

  it('formats midnight (0 minutes) as 12:00 am', () => {
    expect(formatTime(0, '12hr')).toBe('12:00 am');
  });

  it('formats 1:00 am correctly', () => {
    expect(formatTime(60, '12hr')).toBe('1:00 am');
  });

  it('formats 11:59 am correctly', () => {
    expect(formatTime(719, '12hr')).toBe('11:59 am');
  });

  it('formats 1:00 pm correctly', () => {
    expect(formatTime(780, '12hr')).toBe('1:00 pm');
  });

  it('formats 11:59 pm correctly', () => {
    expect(formatTime(1439, '12hr')).toBe('11:59 pm');
  });
});

describe('getStartTimeDisplay', () => {
  it('returns 24hr formatted start time', () => {
    expect(getStartTimeDisplay(m('20:00:00', '01:00:00'), '24hr')).toBe('20:00');
  });

  it('returns 12hr formatted start time', () => {
    expect(getStartTimeDisplay(m('20:00:00', '01:00:00'), '12hr')).toBe('8:00 pm');
  });
});

describe('getEndTime', () => {
  it('adds duration to start time (24hr)', () => {
    expect(getEndTime(m('19:30:00', '01:30:00'), '24hr')).toBe('21:00');
  });

  it('adds duration to start time (12hr)', () => {
    expect(getEndTime(m('19:30:00', '01:30:00'), '12hr')).toBe('9:00 pm');
  });

  it('wraps past midnight correctly (24hr)', () => {
    // 23:30 + 01:00 = 00:30 next day
    expect(getEndTime(m('23:30:00', '01:00:00'), '24hr')).toBe('00:30');
  });

  it('wraps past midnight correctly (12hr)', () => {
    expect(getEndTime(m('23:30:00', '01:00:00'), '12hr')).toBe('12:30 am');
  });

  it('handles a 1.5-hour meeting starting at 07:30', () => {
    expect(getEndTime(m('07:30:00', '01:30:00'), '12hr')).toBe('9:00 am');
  });
});
