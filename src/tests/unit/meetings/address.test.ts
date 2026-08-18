import { describe, it, expect } from 'vitest';
import { tidyDelimiter, formatAddress } from '$lib/meetings/address';
import type { Meeting } from '$lib/meetings/types';

type AddressMeeting = Pick<
  Meeting,
  'location_text' | 'location_street' | 'location_city_subsection' | 'location_neighborhood' | 'location_municipality' | 'location_sub_province' | 'location_province' | 'location_postal_code_1'
>;

function addr(overrides: Partial<AddressMeeting> = {}): AddressMeeting {
  return {
    location_text: '',
    location_street: '',
    location_city_subsection: '',
    location_neighborhood: '',
    location_municipality: '',
    location_sub_province: '',
    location_province: '',
    location_postal_code_1: '',
    ...overrides
  };
}

describe('tidyDelimiter', () => {
  it('replaces ## with ", "', () => {
    expect(tidyDelimiter('Line 1##Line 2')).toBe('Line 1, Line 2');
  });

  it('replaces @@ with ", "', () => {
    expect(tidyDelimiter('Heuston@@Connolly')).toBe('Heuston, Connolly');
  });

  it('replaces multiple occurrences', () => {
    expect(tidyDelimiter('A##B##C')).toBe('A, B, C');
  });

  it('replaces mixed ## and @@ delimiters', () => {
    expect(tidyDelimiter('A##B@@C')).toBe('A, B, C');
  });

  it('passes through a string with no delimiters unchanged', () => {
    expect(tidyDelimiter('No delimiters here')).toBe('No delimiters here');
  });

  it('returns empty string for empty input', () => {
    expect(tidyDelimiter('')).toBe('');
  });

  // The original Angular tidy-delimiter.pipe.ts returned null (unimplemented).
  // This is the corrected version — it must return the cleaned string.
  it('never returns null — corrected behaviour vs the original broken pipe', () => {
    expect(tidyDelimiter('A##B')).not.toBeNull();
    expect(typeof tidyDelimiter('A##B')).toBe('string');
  });
});

describe('formatAddress', () => {
  it('returns only non-empty fields', () => {
    const lines = formatAddress(
      addr({
        location_text: "St Mary's Hall",
        location_municipality: 'Dublin'
      })
    );
    expect(lines).toEqual(["St Mary's Hall", 'Dublin']);
  });

  it('returns all fields when all are present', () => {
    const lines = formatAddress(
      addr({
        location_text: 'Hall',
        location_street: '1 Main St',
        location_city_subsection: 'Suburb',
        location_neighborhood: 'Neighbourhood',
        location_municipality: 'City',
        location_sub_province: 'County',
        location_province: 'Province',
        location_postal_code_1: 'D01 XY01'
      })
    );
    expect(lines).toHaveLength(8);
    expect(lines[0]).toBe('Hall');
    expect(lines[7]).toBe('D01 XY01');
  });

  it('returns an empty array when all fields are empty', () => {
    expect(formatAddress(addr())).toEqual([]);
  });

  it('omits fields that are whitespace-only', () => {
    const lines = formatAddress(
      addr({
        location_text: '   ',
        location_municipality: 'Cork'
      })
    );
    expect(lines).toEqual(['Cork']);
  });

  it('preserves the correct display order', () => {
    // order: text, street, city_subsection, neighborhood, municipality, sub_province, province, postal
    const lines = formatAddress(
      addr({
        location_street: 'Street',
        location_sub_province: 'County Cork'
      })
    );
    expect(lines).toEqual(['Street', 'County Cork']);
  });
});
