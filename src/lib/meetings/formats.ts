/**
 * Resolves a meeting's `format_shared_id_list` to a human-readable string.
 *
 * Ported from `setExplodedFormatsOnMeetingList()` in
 * `NA-Ireland-Ionic-6/src/app/services/tomato-formats.service.ts`.
 *
 * @param formatSharedIdList  Comma-separated format IDs from the BMLT record.
 * @param formatNames         Map of format id → display name (from `getFormats()`).
 * @returns                   Format names joined with ". " and trimmed.
 *                            IDs with no matching name are silently skipped.
 */
export function explodeFormats(formatSharedIdList: string, formatNames: Record<string, string>): string {
  if (!formatSharedIdList || !formatSharedIdList.trim()) return '';

  const parts: string[] = [];
  for (const id of formatSharedIdList.split(',')) {
    const trimmed = id.trim();
    if (!trimmed) continue;
    const name = formatNames[trimmed];
    if (name) {
      parts.push(name);
    }
    // IDs with no matching name are silently skipped (matches original pattern).
  }

  return parts.join('. ').trim();
}
