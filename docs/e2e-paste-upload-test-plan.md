# E2E Paste Upload Test Plan

Playwright is not wired for this repository in this pass, so this is a practical test plan for later implementation.

## Scope

Validate upload queue + clipboard paste behavior for authenticated users.

## Preconditions

- App running locally (`npm run dev`)
- Mocked or test auth session available in local storage
- Upload API mocked or test worker endpoint configured

## Scenarios

1. **Single image paste success**
   - Open `/upload`
   - Simulate paste with one PNG image
   - Assert queue item appears
   - Assert status transitions: queued -> uploading -> success
   - Assert success toast and gallery redirect behavior

2. **Multiple image paste queueing**
   - Simulate paste with 3 valid images
   - Assert all 3 queue items are added
   - Assert only 2 upload concurrently (default concurrency)
   - Assert all finish successfully

3. **Mixed valid + invalid clipboard content**
   - Simulate paste with 1 PNG + 1 unsupported type
   - Assert PNG is queued
   - Assert warning toast for rejected type

4. **Oversized image rejection**
   - Simulate paste with image >10MB
   - Assert item is rejected before enqueue or marked error with message

5. **Retry failed item**
   - Mock one upload failure
   - Assert queue item status `error`
   - Click retry and assert second attempt succeeds

6. **Typing guard**
   - Focus an `input` element
   - Trigger paste
   - Assert no queue item is created

## Implementation Notes

- Prefer API mocking in browser context so tests do not require production credentials.
- Seed auth state directly in `localStorage` before navigating.
- Use deterministic fake files (`Blob`/`File`) for paste payloads.
