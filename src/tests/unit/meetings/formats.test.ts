import { describe, it, expect } from 'vitest';
import { explodeFormats } from '$lib/meetings/formats';

describe('explodeFormats', () => {
  it('joins all resolved names with ". "', () => {
    const names = { '1': 'Open', '2': 'Closed', '3': 'Beginner' };
    expect(explodeFormats('1,2,3', names)).toBe('Open. Closed. Beginner');
  });

  it('silently skips IDs with no matching name', () => {
    const names = { '1': 'Open' };
    expect(explodeFormats('1,99', names)).toBe('Open');
  });

  it('returns empty string for an empty id list', () => {
    expect(explodeFormats('', { '1': 'Open' })).toBe('');
  });

  it('returns empty string when no IDs match', () => {
    expect(explodeFormats('99,100', { '1': 'Open' })).toBe('');
  });

  it('handles whitespace around IDs', () => {
    const names = { '1': 'Open', '2': 'Closed' };
    expect(explodeFormats(' 1 , 2 ', names)).toBe('Open. Closed');
  });

  it('handles a single ID', () => {
    const names = { '5': 'Beginners' };
    expect(explodeFormats('5', names)).toBe('Beginners');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(explodeFormats('   ', { '1': 'Open' })).toBe('');
  });
});
