# GRANTLY

GRANTLY is a responsive scholarship-planning application built with React,
TypeScript, and Vite. Its demonstration workspace brings scholarship discovery,
profile-based eligibility matching, application tracking, document organization,
and deadline planning together. It does not connect to a scholarship provider or
cloud account.

> **Demonstration data:** scholarships and student defaults are sample records,
> not verified live offers. Always confirm current terms and deadlines with the
> scholarship provider.

## Application modules

| Module | Route | What it does |
| --- | --- | --- |
| Dashboard | `/dashboard` | Summarizes profile completion, tracked applications, sample opportunities, recent activity, and upcoming catalogue deadlines. |
| Explore | `/explore` | Searches and filters the local scholarship catalogue; supports saving and comparing opportunities. |
| Smart Match | `/eligibility` | Calculates explainable rule-based match results and profile-improvement suggestions. |
| Saved | `/saved` | Shows opportunities saved from the catalogue. |
| Applications | `/applications` | Tracks application status, notes, submission and reminder dates, event history, and a manual required-document checklist. Includes list and board views. |
| Document Vault | `/documents` | Stores PDF/JPG/JPEG/PNG files in IndexedDB and metadata in browser local storage; supports previews, status, expiration, and application associations. |
| Deadline Calendar | `/calendar` | Shows scholarship deadlines, application submission dates and reminders, vault-document expiration dates, and personal reminders in month, week, or agenda views. Personal reminders are editable. |
| Profile | `/profile` | Edits the student information used for eligibility and match calculations. |
| Scholarship details | `/scholarships/:scholarshipId` | Presents the catalogue record, eligibility, requirements, and actions to save or track it. |

Unknown routes redirect to `/dashboard`. The sidebar in the shared application
shell links to the primary modules.

## Technology

- React 19, TypeScript 5.9, and React Router 7
- Vite 7 and Tailwind CSS 4
- Recharts for data visualizations
- Framer Motion for selected transitions
- Lucide React for icons
- Vitest, jsdom, and Testing Library for automated tests

## Requirements and setup

Use a Node.js release supported by the installed Vite version (Node.js 20.19+
or 22.12+ recommended) and npm.

```bash
npm ci
npm run dev
```

Vite prints the local development URL after starting. The `@/` import alias
maps to `src/` and is configured consistently in `vite.config.ts` and
`vitest.config.ts`.

## Development, validation, and production

```bash
npm run dev                         # Start the local Vite server
npm run typecheck                   # Type-check application and test sources
npm test                            # Run tests serially with stable timeouts
npm run build                       # Build static assets into dist/
npm run preview                     # Serve the production build locally
```

The production build contains an HTML entry point and JavaScript/CSS assets.
For Vercel, import the GitHub repository, use `npm run build` as the build
command and `dist` as the output directory. The root `vercel.json` configures
SPA route fallback and baseline response security headers. For other static
hosts, configure equivalent rewrites so application routes serve `index.html`.
Use HTTPS for production hosting, especially when users store personal records
in their browser. No deployment has been performed by this project setup; no
server API, authentication, synchronization, or cloud document service is
included.

## Architecture and data flow

The application separates route-level views, reusable UI, shared state,
domain/data definitions, browser persistence, and pure business logic:

1. `main.tsx` mounts the React application; `App.tsx` defines the router,
   providers, and lazy-loaded route modules.
2. `AppLayout` provides the responsive sidebar, top header, and route outlet.
   Page modules compose shared UI primitives and feature components.
3. `StudentDataProvider` owns the shared scholarship catalogue, profile,
   saved IDs, application records, and activity data. Feature pages read this
   state with `useStudentData`; application mutations go through its validated
   actions and update the tracker state used elsewhere.
4. `DocumentVaultProvider` owns document metadata and coordinates file
   operations with IndexedDB. Calendar and application views derive their
   document-related content from those same records.
5. `data/` contains demonstration records and navigation/status configuration.
   `utils/` contains pure matching, filtering, date, and application logic.
   `services/` contains browser persistence and the eligibility matching
   engine. `types/` defines shared TypeScript contracts.
6. Components use the shared design primitives from `components/ui`; the
   Tailwind theme and global styles live in `index.css`.

### Major components

- `components/layout/AppLayout.tsx` composes `Sidebar.tsx`, `TopHeader.tsx`,
  and the route outlet; the sidebar also owns the mobile navigation drawer.
- `StudentDataProvider`, `DocumentVaultProvider`, and `ToastProvider` are the
  shared state and feedback boundaries. Pages call provider actions rather than
  writing tracker records directly.
- The Applications page reuses `ApplicationList`, `ApplicationBoard`,
  `ApplicationDetail`, and `ApplicationOverview` from
  `components/applications/`.
- The Smart Match page composes `MatchingSummaryHero`, `MatchStatTile`,
  `MatchCard`, `MatchRing`, `MatchDetailDrawer`, and
  `MatchDistributionChart` from `components/eligibility/`.
- Document Vault and Calendar are page-level compositions in `pages/`; they
  delegate persistence and derived domain data to their providers, services,
  and utilities rather than maintaining duplicate application records.

State flow is one-way: pages invoke provider actions, providers update their
in-memory state and persist it, and derived dashboard/calendar/match views
recompute from that shared state. Scholarship and application records are not
copied into a second calendar or document-specific tracker.

### Folder map

```text
src/
  components/       Feature components, app layout, and shared UI
  context/          Student data, document vault, and toast providers
  data/             Demo scholarship records, navigation, and statuses
  hooks/            Reusable date, title, media, and matching hooks
  pages/            Route-level pages
  services/         Browser persistence, IndexedDB, and matching engine
  tests/            UI and pure-logic tests
  types/            Shared domain and view types
  utils/            Framework-independent domain calculations
  App.tsx           Providers, router, and lazy route declarations
  index.css         Tailwind theme and global styles
  main.tsx          React entry point
```

## Eligibility matching

The Smart Match engine in `services/matchingEngine.ts` is deterministic and
rule-based; it does not call an AI model or infer missing student facts. It
evaluates each scholarship's declared criteria against the current profile.
Criteria are grouped (education, academic, financial, location, course,
personal, achievements, and research). Configured group weights are divided
among the applicable criteria in each group and normalized across the
scholarship's applicable criteria. Satisfied criteria earn their normalized
weight; unmet or missing criteria earn zero. Not-applicable criteria are
excluded from the denominator.

Classification is rule-first: a failed mandatory criterion produces **Not
Eligible** regardless of score; missing mandatory information produces
**Potential Match**; otherwise, a score at or above the configured 80% strong
match threshold is a **Strong Match**. Remaining results are **Low Match**.
The result includes the criteria and explanations used to reach the outcome.
The separate `utils/eligibility.ts` utility supports the earlier, simpler
eligibility summary used in scholarship detail views.

## Browser persistence and privacy

- `services/storageService.ts` stores small JSON data in `localStorage` under
  the `grantly_v1_` key prefix. This includes profile, application, saved and
  comparison state, personal calendar reminders, and document metadata.
- `services/documentStorage.ts` stores document file blobs in IndexedDB. File
  bytes are not written into local storage. Metadata includes category, status,
  expiry, and application associations.
- Application records are the source for application status, recorded
  submission dates, tracker reminders, and history. Personal calendar reminders
  are separate records and do not edit scholarship deadlines.
- Browser storage is device/browser-local. It is not secure cloud storage,
  encrypted backup, or cross-device synchronization. Data may be removed by
  clearing browser storage. Keep independent copies of important documents.
- Google Fonts are requested from Google's font CDN; the app does not bundle
  font files or require that service for its system-font fallbacks.
- If browser persistence fails, the UI reports that failure rather than
  indicating a successful save.

## Known limitations

- Scholarship listings are static demonstration data and may not reflect
  current offers, eligibility rules, or official deadlines.
- Profile, application, reminder, and vault state is local to one browser.
- Document verification status is a user-managed label; there is no external
  review or verification service.
- The application has no account system, backend, cloud backup, or
  cross-device synchronization.
- The application tracker's required-document checklist is a manual readiness
  checklist. Vault application associations are separate file links and do not
  automatically mark that checklist complete.
- No analytics or real-user Core Web Vitals collection is configured.

## Accessibility and responsive behavior

The shared shell includes semantic landmarks, a skip link, keyboard-operable
navigation, visible focus styles, and a mobile navigation drawer. Forms and
dialogs use labels and accessible names; reduced-motion preferences are
respected by the global stylesheet and animated UI primitives. Layouts use
responsive breakpoints for narrow phones, tablets, and desktop displays.

Automated browser tests run in jsdom and verify interactions and state. For
visual QA, also check the application in a real browser at 360, 390, 768, 1024,
and 1440 CSS pixels; automated DOM tests do not replace device/browser testing.

## Maintaining domain behavior

Comments are kept near non-obvious rules—especially eligibility scoring and
browser storage behavior—rather than repeating what component code already
expresses. Update the relevant tests and this README when changing a documented
domain rule or storage boundary.
