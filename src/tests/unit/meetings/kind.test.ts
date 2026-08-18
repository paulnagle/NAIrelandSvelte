import { describe, it, expect } from 'vitest';
import { getMeetingKind } from '$lib/meetings/kind';
import type { Meeting } from '$lib/meetings/types';

// Minimal Meeting stub — kind.ts only needs `formats`
function m(formats: string): Pick<Meeting, 'formats'> {
  return { formats };
}

describe('getMeetingKind', () => {
  it('returns inperson when formats is empty string', () => {
    expect(getMeetingKind(m(''))).toBe('inperson');
  });

  it('returns inperson when formats contains none of VM, TC, HY', () => {
    expect(getMeetingKind(m('BT,O,NS'))).toBe('inperson');
  });

  it('returns virtual when formats contains VM only', () => {
    expect(getMeetingKind(m('VM'))).toBe('virtual');
  });

  it('returns virtual when formats contains VM plus unrelated codes', () => {
    expect(getMeetingKind(m('VM,O,BT'))).toBe('virtual');
  });

  it('returns tempreplace when formats contains both VM and TC (no HY)', () => {
    expect(getMeetingKind(m('VM,TC'))).toBe('tempreplace');
  });

  it('returns tempreplace when formats contains VM, TC plus others (no HY)', () => {
    expect(getMeetingKind(m('TC,VM,O'))).toBe('tempreplace');
  });

  it('returns hybrid when formats contains HY only', () => {
    expect(getMeetingKind(m('HY'))).toBe('hybrid');
  });

  it('returns hybrid when formats contains both HY and VM (no TC)', () => {
    // VM+HY together → hybrid (matches original getMeetingType logic, line 143-144)
    expect(getMeetingKind(m('HY,VM'))).toBe('hybrid');
  });

  it('returns hybrid when formats contains HY with other non-virtual codes', () => {
    expect(getMeetingKind(m('HY,O,BT'))).toBe('hybrid');
  });

  it('returns tempclosed when formats contains TC only (no VM, no HY)', () => {
    expect(getMeetingKind(m('TC'))).toBe('tempclosed');
  });

  it('returns tempclosed when formats contains TC plus unrelated codes (no VM, no HY)', () => {
    expect(getMeetingKind(m('TC,O'))).toBe('tempclosed');
  });
});
