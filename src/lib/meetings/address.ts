import type { Meeting } from '$lib/meetings/types';

/**
 * Replaces BMLT delimiter strings (`##` and `@@`) with `, `.
 *
 * The BMLT uses these as field separators within bus_lines and train_lines.
 * The original Angular app had a `tidy-delimiter.pipe.ts` for this, but its
 * `transform()` was unimplemented (returned `null`). This is the corrected
 * version — it must return the cleaned string, not null.
 */
export function tidyDelimiter(value: string): string {
  if (!value) return value;
  return value.replace(/##|@@/g, ', ');
}

/**
 * Returns a non-empty array of address lines built from the BMLT fields of
 * a meeting record, in the same display order as the original meeting card.
 *
 * Only fields with a non-empty value are included.
 */
export function formatAddress(
  meeting: Pick<
    Meeting,
    'location_text' | 'location_street' | 'location_city_subsection' | 'location_neighborhood' | 'location_municipality' | 'location_sub_province' | 'location_province' | 'location_postal_code_1'
  >
): string[] {
  const fields: string[] = [
    meeting.location_text,
    meeting.location_street,
    meeting.location_city_subsection,
    meeting.location_neighborhood,
    meeting.location_municipality,
    meeting.location_sub_province,
    meeting.location_province,
    meeting.location_postal_code_1
  ];
  return fields.filter((f) => f && f.trim().length > 0);
}
