# Meeting directions plan

## Top-Level Overview
Replace the Directions action in [`MeetingCard.svelte`](src/lib/components/MeetingCard.svelte) so it opens Apple Maps on iOS, the Google Maps app on Android, and falls back to the Google Maps web URL when native app opening is unavailable or fails. Keep the change scoped to the Directions action only and leave sharing behavior unchanged.

## Sub-Tasks

### 1. Add a focused directions helper
- **Intent** — Move platform-aware directions URL selection and fallback behavior out of the component so [`MeetingCard.svelte`](src/lib/components/MeetingCard.svelte) stays simple and follows the existing platform-helper pattern used by [`src/lib/platform.ts`](src/lib/platform.ts).
- **Expected Outcomes** — A helper encapsulates native URL construction for iOS and Android, includes coordinates plus a label where supported, and automatically falls back to the Google Maps web URL on failure.
- **Todo List**
  1. Create a helper in [`src/lib`](src/lib) that builds the native and fallback directions URLs from a [`Meeting`](src/lib/meetings/types.ts) record.
  2. Use [`isIOS()`](src/lib/platform.ts:14), [`isAndroid()`](src/lib/platform.ts:9), and the existing [`Browser.open`](src/lib/components/MeetingCard.svelte:75) pattern to try the native URL first and then retry with the Google Maps web URL if needed.
  3. Keep the logic limited to the Directions use case and avoid changing share-link generation in [`buildSharePayload()`](src/lib/meetings/share.ts:15).
- **Relevant Context** — [`src/lib/components/MeetingCard.svelte`](src/lib/components/MeetingCard.svelte), [`src/lib/platform.ts`](src/lib/platform.ts), [`buildSharePayload()`](src/lib/meetings/share.ts:15), [`Meeting`](src/lib/meetings/types.ts)
- **Status** — [x] done

### 2. Wire the helper into the meeting card
- **Intent** — Replace the current hard-coded Google Maps web URL in [`openMaps()`](src/lib/components/MeetingCard.svelte:74) with the new helper while preserving the existing button visibility and UI.
- **Expected Outcomes** — Tapping Directions from the meeting card uses platform-aware behavior without changing when the button appears or how the rest of the card works.
- **Todo List**
  1. Update [`MeetingCard.svelte`](src/lib/components/MeetingCard.svelte) to import and call the new helper from [`openMaps()`](src/lib/components/MeetingCard.svelte:74).
  2. Leave [`showDirections`](src/lib/components/MeetingCard.svelte:51), sharing, virtual-link, and phone actions unchanged.
- **Relevant Context** — [`openMaps()`](src/lib/components/MeetingCard.svelte:74), [`showDirections`](src/lib/components/MeetingCard.svelte:51)
- **Status** — [x] done

### 3. Validate the behavior with targeted tests
- **Intent** — Add or update tests around the new helper so platform routing and fallback are pinned without needing to unit-test Capacitor directly inside the Svelte component.
- **Expected Outcomes** — Test coverage confirms URL selection for iOS, Android, and fallback behavior, while existing share tests remain unchanged.
- **Todo List**
  1. Add unit tests for the new helper, mocking platform detection and browser opening as needed.
  2. Confirm [`src/tests/unit/meetings/share.test.ts`](src/tests/unit/meetings/share.test.ts) does not need behavior changes because sharing remains out of scope.
  3. Run the relevant validation, at minimum the affected unit tests and any broader checks needed by the project.
- **Relevant Context** — [`src/tests/unit/meetings/share.test.ts`](src/tests/unit/meetings/share.test.ts), [`src/lib/platform.ts`](src/lib/platform.ts), [`MeetingCard.svelte`](src/lib/components/MeetingCard.svelte)
- **Status** — [x] done
