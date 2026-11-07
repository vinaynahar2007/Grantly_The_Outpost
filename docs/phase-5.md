# Phase 5: Application Tracker

## Routes and workflows

- `/applications` supports list and Kanban views, search, status/deadline filters, sorting, completed applications and deletion confirmation.
- `/applications?application=<id>` opens a refresh-safe application detail drawer. It supports status, personal notes, actual submission dates, a personal reminder date, document-readiness checklists and chronological history.
- Add applications from the Saved shortlist or the full existing scholarship catalogue. Explorer and Saved cards also promote an opportunity directly into the same tracker.
- Scholarship details link to the exact application. No provider submission is performed by adding a record.

## Data contract

`ScholarshipApplication` stores the scholarship ID, not copied provider/title/award/deadline data. `joinApplications` resolves the current scholarship record for display.

`src/data/applicationStatuses.ts` is the single status configuration. Saved, Preparing, Submitted, Under Review and Shortlisted are active. Awarded, Rejected and Withdrawn are terminal. "In Progress" includes Saved, Preparing, Under Review and Shortlisted; "Submitted" counts the Submitted stage separately.

The dashboard uses the same records and status colours. Its active count now correctly excludes awarded applications, in addition to rejected and withdrawn ones.

Only Saved and Preparing applications need submission and can be flagged overdue. Submitted and later stages are not flagged as overdue merely because the scholarship deadline has passed.

## Persistence and migration

- Existing `grantly_v1_scholar_applications` storage is reused.
- Legacy `drafting`, `review` and `declined` stages migrate to Preparing, Under Review and Rejected. Notes and valid timestamps survive. Unknown creation/submission dates remain null. Earlier history is never invented.
- An intentionally empty tracker stays empty after refresh. Invalid records, unknown scholarship references, invalid events and duplicate active attempts are discarded safely.
- Each real change appends a timestamped event. Changing status does not fabricate a submission date. No-op saves do not add events.
- The provider guards both duplicate creation and reopening conflicts, including rapid consecutive requests.
- The demo reference date is persisted separately, so sample deadlines do not move forward on every refresh. Scholarship records themselves are not duplicated in storage. Reset Demo deliberately resets that reference date.
- Storage failures show a warning; in-memory edits can continue for the current session.

## Verification

```sh
npx tsc --noEmit
npx vitest run
npm run build
```

Browser and WCAG checks are in `scripts/verify-applications.cjs`. Playwright tooling was installed outside the project to avoid adding production dependencies:

```sh
npm install --prefix /tmp/grantly-browser --no-save playwright @axe-core/playwright
node /tmp/grantly-browser/node_modules/playwright/cli.js install --with-deps chromium
# Start Vite in a separate terminal:
npm run dev -- --host 0.0.0.0
NODE_PATH=/tmp/grantly-browser/node_modules node scripts/verify-applications.cjs
```

The browser script checks 1440px, 834px, 390px and 320px layouts; keyboard focus containment; refresh persistence; list/board transitions; duplicate prevention; status history; withdrawal; confirmed deletion; dashboard synchronization; and earlier routes. It runs WCAG A/AA scans on list, board, detail and add views. Screenshots and the report are written to `artifacts/phase5/`.

## Scope

This is a browser-local demonstration workspace. Provider integrations, real document uploads, background reminders, authentication and cross-device synchronization are not implemented. Document checkboxes record personal readiness, not provider verification. All scholarship records remain explicitly labelled sample data.
