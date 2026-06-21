# Implementation Plan v2 — Action Feed Dashboard with Deadline Radar

## Overview

This plan replaces the tab and table dashboard with a single prioritized
action feed organized by deadline urgency, backed by a deadline radar summary
strip. Each scholarship surfaces its one next action, sorted so the most
urgent and most actionable work rises to the top. Unstarted scholarships get
a pinned Ready to start group so new opportunities are never buried. View and
edit collapse into one editable panel that also holds the essays, which
retires the separate Edit Application page. A grid view remains as a secondary
toggle for scanning and sorting. App versioning is wired in.

Every disconnect that surfaced during design traced back to the old two page
split, so this plan consolidates the controls onto one surface with a single
write path.

---

## [x] 1. Versioning

Pattern copied from `/Users/teial/Projects/internship-tracker`.

### [x] 1.1 Files to create

- [x] 1.1.1 Create `version.txt` at the repo root with initial value `2.0.0`.

### [x] 1.2 Files to modify

- [x] 1.2.1 Update `web/vite.config.ts` to read `version.txt` and inject via `define`:

  ```typescript
  import { readFileSync } from 'fs';
  import { resolve } from 'path';

  const version = readFileSync(resolve(__dirname, '../version.txt'), 'utf-8').trim();

  export default defineConfig({
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
    },
    // ...rest unchanged
  });
  ```

- [x] 1.2.2 Update `web/src/vite-env.d.ts` to add `VITE_APP_VERSION` to `ImportMetaEnv`:

  ```typescript
  interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_APP_VERSION: string;
  }
  ```

- [x] 1.2.3 Update `web/src/components/Navigation.tsx` to add a version badge next to
  "Scholarship Manage" in the logo `<Link>`:

  ```tsx
  <span className="text-white font-bold text-base md:text-lg">Scholarship Manage</span>
  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/20 text-white/80">
    v{import.meta.env.VITE_APP_VERSION}
  </span>
  ```

---

## [x] 2. Application Statuses

### [x] 2.1 Existing status set

- [x] 2.1.1 Keep the existing application statuses. Do not add an `Archived` status.
- [x] 2.1.2 Define the done set as `Submitted`, `Awarded`, and `Not Awarded`. These
  have no next action and drop out of the action feed, collapsing into a
  "show decided" footer.
- [x] 2.1.3 Past due applications stay in their current status and are identified
  visually through the deadline urgency system.

---

## [x] 3. Essay Completion

This is the foundation. Every action label, the essay progress bar, and the
radar counts all read from one predicate, so it gets pinned down first.

### [x] 3.1 The predicate

- [x] 3.1.1 Define the essay status enum as a union type:

  ```typescript
  type EssayStatus = 'not_started' | 'in_progress' | 'completed';
  ```

- [x] 3.1.2 Define a single completion function. Only `Complete` counts. Do not
  factor in word count, so an essay cannot be done by length and not done by
  status at the same time.

  ```typescript
  const isEssayComplete = (essay: Essay) => essay.status === 'completed';

  const essayProgress = (app: ApplicationResponse) => ({
    done: app.essays.filter(isEssayComplete).length,
    total: app.essays.length,
  });
  ```

- [x] 3.1.3 Route the progress bar, the radar counts, and the "Finish N of M essays"
  label through `essayProgress`. No other place computes essay completion.

### [x] 3.2 Reconcile existing data

- [x] 3.2.1 The current detail card reads one of three complete while all three essay
  rows read Not Started. Find the second definition of done that is causing
  this, usually a stale `completedCount` field or a word count check, and
  remove it. The number and the statuses must agree before anything is built
  on top of them.

---

## [x] 4. Deadline Urgency System

A shared utility drives consistent urgency cues across the feed, the radar,
the grid, and the Ready to start group.

### [x] 4.1 Urgency utility

- [x] 4.1.1 Create `web/src/utils/deadline.ts` exporting:
  - `getDeadlineUrgency(dueDate, status)` returns `'overdue' | 'critical' | 'warning' | 'normal'`
  - `getUrgencyLabel(dueDate, status)` returns `"Overdue"` or `"X days left"` or `null`

  Tier definitions:

  | Tier | Condition |
  | --- | --- |
  | `overdue` | `dueDate < today`, status not in done set |
  | `critical` | one to seven days remaining |
  | `warning` | eight to fourteen days remaining |
  | `normal` | more than fourteen days remaining |

- [x] 4.1.2 Items with no due date return `normal` and carry a `"No deadline"` label
  rather than a day count.

---

## [x] 5. Next Action Derivation

The next action line is the product. It is computed from the record, with the
manual `currentAction` text used only as a fallback.

### [x] 5.1 The function

- [x] 5.1.1 Create `web/src/utils/deriveNextAction.ts`:

  ```typescript
  type ActionKind = 'essays' | 'submit' | 'start' | 'waiting' | 'none';

  interface NextAction {
    label: string;
    kind: ActionKind;
    actionable: boolean;
  }

  const DONE = new Set(['Submitted', 'Awarded', 'Not Awarded']);

  function deriveNextAction(app: ApplicationResponse): NextAction {
    if (DONE.has(app.status)) {
      return { label: '', kind: 'none', actionable: false };
    }

    const { done, total } = essayProgress(app);
    const essaysLeft = total - done;
    if (essaysLeft > 0) {
      const tail = essaysLeft === 1 ? ', then submit' : '';
      return {
        label: `Finish ${essaysLeft} of ${total} essays${tail}`,
        kind: 'essays',
        actionable: true,
      };
    }

    if (looksLikeWaiting(app.currentAction)) {
      return { label: app.currentAction, kind: 'waiting', actionable: false };
    }

    if (app.status === 'Not Started') {
      return { label: 'Start application', kind: 'start', actionable: true };
    }

    return { label: 'Review and submit', kind: 'submit', actionable: true };
  }
  ```

- [x] 5.1.2 Implement `looksLikeWaiting(text)` as a small keyword check against the
  manual current action, matching terms like `waiting`, `recommendation`, and
  `pending`. The `actionable` flag separates work the applicant controls from
  work they are blocked on, which drives both sort order and the muted row
  treatment.

---

## [ ] 6. Deadline Radar

The altitude view. Always visible above the feed.

### [ ] 6.1 Component

- [ ] 6.1.1 Create `web/src/components/DeadlineRadar.tsx`.
  Props: `applications: ApplicationResponse[]`. Computes counts internally.

- [ ] 6.1.2 Render four count tiles: Overdue, Due this week, Next two weeks, and Not
  started. The first three are deadline tiers. Not started is an informational
  count, styled in blue rather than an urgency color, since these are
  opportunities and not fires.

- [ ] 6.1.3 Each tile is clickable and filters the feed to that group.

- [ ] 6.1.4 Keep the radar visually compact: one row on desktop, two columns on
  narrow mobile, with the view toggle aligned to the right of the section
  header when space allows.

---

## [ ] 7. Action Feed

The default view. The ground view that says what to touch first.

### [ ] 7.1 Components

- [ ] 7.1.1 Create `web/src/components/ActionRow.tsx`.
  Props: `application: ApplicationResponse`. Renders the urgency left border
  and icon, the scholarship name and organization, the next action line from
  `deriveNextAction`, a days remaining badge, and a chevron. Opens the
  combined panel on click. Waiting rows render muted with an hourglass icon.

- [ ] 7.1.2 Create `web/src/components/ActionFeed.tsx`.
  Props: `applications: ApplicationResponse[]`. Groups rows by deadline tier
  with section headers, hides done items behind a "show decided" footer, and
  renders the empty state when nothing needs action.

### [ ] 7.2 Grouping and sort

- [ ] 7.2.1 Group by deadline tier so the feed lines up visually with the radar:
  Overdue, Due this week, Next two weeks, and No deadline set.
- [ ] 7.2.2 Within a tier, sort actionable items above waiting items, then by due
  date ascending.
- [ ] 7.2.3 Items with no due date fall into a "No deadline set" group at the bottom,
  above the decided footer.
- [ ] 7.2.4 Done items collapse into a quiet footer such as "3 submitted or decided,
  hidden from the feed" with a Show control.

### [ ] 7.3 Row treatments

- [ ] 7.3.1 Use a colored left border by urgency: red for overdue, orange for due
  this week, and neutral or amber for next two weeks.
- [ ] 7.3.2 Use Lucide icons for row meaning: alert or clock for deadline urgency,
  hourglass for waiting, and play or flag for start actions. Do not hand-draw
  icons.
- [ ] 7.3.3 The days badge text should match the row state, for example "3 days
  overdue", "5 days left", "No deadline", or "28 days left".

---

## [ ] 8. Ready to Start Group

Pinned so new opportunities are always visible regardless of deadline.

### [ ] 8.1 Component and routing

- [ ] 8.1.1 Create `web/src/components/ReadyToStart.tsx`.
  Props: `applications: ApplicationResponse[]`. Always renders when it has
  contents.

- [ ] 8.1.2 Routing rule so nothing double lists. A `Not Started` item with a due
  date inside the fourteen day window appears in its urgency tier in the feed.
  Every other `Not Started` item lives here.

- [ ] 8.1.3 Sort by soonest deadline, then by most recently added so a freshly
  entered scholarship floats to the top.

- [ ] 8.1.4 Show a "New" badge on any item with `createdAt` inside the last seven
  days.

- [ ] 8.1.5 Include no-deadline items in this group with a `"No deadline"` badge
  after dated items.

---

## [ ] 9. Combined View and Edit Panel

One editable surface. Opens from a feed row or a grid row. Retires the separate
Edit Application page.

### [ ] 9.1 Component

- [ ] 9.1.1 Create `web/src/components/ApplicationPanel.tsx`.
  Props: `application: ApplicationResponse`, `onClose`. Renders as a right side
  drawer.

- [ ] 9.1.2 Top of the panel shows the scholarship title, organization, and close
  button.

- [ ] 9.1.3 Below the title, show a read only smart summary card: the next action,
  urgency pill, and essay progress bar. This is computed, never edited
  directly.

- [ ] 9.1.4 Below the summary, application fields are directly editable in place:
  status, due date, award amount, current action, and the rest. There is no
  separate edit mode and no Edit button.

- [ ] 9.1.5 A sticky save bar appears only when a field changes, offering Save and
  Discard. The save bar should clearly say unsaved changes are present.
  Autosave on blur is optional, but the explicit Save and Discard path is
  required.

### [ ] 9.2 Essays inside the panel

- [ ] 9.2.1 Render the essay list inside the same panel. Each row is editable: theme,
  a status dropdown bound to `EssayStatus`, word count, and the Google Doc
  link, plus add and delete.

- [ ] 9.2.2 The portal does not store essay body text. The theme is the essay prompt
  or topic, and the actual writing lives in a linked Google Doc. Each row has
  an open button that opens `googleDocUrl` in a new tab. There is no in app
  essay editor, so the row is purely metadata plus the link out.

- [ ] 9.2.3 The status dropdown is the single write path for essay completion.
  Changing it updates the summary progress bar, the radar counts, and the feed
  action line live.

---

## [ ] 10. Grid View

Secondary toggle for scanning and sorting. Adapted from the existing table.

### [ ] 10.1 Columns and behavior

- [ ] 10.1.1 Columns: Scholarship Name, Organization, Status, Due Date, Award Amount,
  Current Action, Actions.
- [ ] 10.1.2 Clicking a column header cycles ascending, descending, unsorted. Unsorted
  falls back to API order by `createdAt` desc. Show a sort indicator on the
  active column. Sorting is desktop only.
- [ ] 10.1.3 Apply the deadline urgency row treatments: a subtle row tint by tier, an
  urgency icon before the name, and a colored due date cell.
- [ ] 10.1.4 A row click opens the same `ApplicationPanel` used by the feed.

### [ ] 10.2 Filtering

- [ ] 10.2.1 Replace the In Progress and Submitted tab UI with a small set of quick
  chips above the content: Needs action, Waiting on others, and All. Filtering
  is client side on the already fetched list.
- [ ] 10.2.2 Needs action maps to non-done applications where
  `deriveNextAction(app).actionable` is true.
- [ ] 10.2.3 Waiting on others maps to non-done applications where
  `deriveNextAction(app).kind === 'waiting'`.
- [ ] 10.2.4 All includes every application, including submitted and decided records.

### [ ] 10.3 Component

- [ ] 10.3.1 Create `web/src/components/GridView.tsx`.
  Props: `applications: ApplicationResponse[]`. Manages sort and filter state
  internally. Extracts the table and pagination logic out of the old
  `Dashboard.tsx`.

---

## [ ] 11. View Toggle

### [ ] 11.1 Component

- [ ] 11.1.1 Create `web/src/components/ViewToggle.tsx`.
  Props: `view: 'feed' | 'grid'`, `onChange`.
- [ ] 11.1.2 Persist to `localStorage` under key `"dashboard-view"`. Default `"feed"`.
- [ ] 11.1.3 Use compact Feed and Grid controls with icons, matching the dashboard
  header placement shown in the design.

---

## [ ] 12. Dashboard Refactor

### [ ] 12.1 New structure

- [ ] 12.1.1 Replace the current implementation with:

  ```text
  Dashboard
  ├── Welcome banner (unchanged)
  ├── DashboardReminders (unchanged)
  ├── DeadlineRadar
  ├── ReadyToStart
  ├── ViewToggle
  └── ActionFeed  OR  GridView  (based on toggle)
  ```

### [ ] 12.2 Removals

- [ ] 12.2.1 Remove `activeTab` and the tab UI.
- [ ] 12.2.2 Remove `inProgressCount` and `submittedCount` derived values.
- [ ] 12.2.3 Remove the inner `AppTable` and `Pagination` (move into `GridView`).
- [ ] 12.2.4 Remove the separate Edit Application page once `ApplicationPanel` covers
  both views and the essays.

### [ ] 12.3 Additions

- [ ] 12.3.1 Add `view` state initialized from `localStorage`, default `"feed"`.
- [ ] 12.3.2 Add selected radar filter state in `Dashboard.tsx` or a small dashboard
  hook so `DeadlineRadar` can filter `ActionFeed` without forcing a full route
  change.
- [ ] 12.3.3 Add selected application state so both `ActionFeed` and `GridView` can
  open the same `ApplicationPanel`.

---

## [ ] 13. Implementation Order

- [ ] 13.1 `version.txt`, `vite.config.ts`, `vite-env.d.ts`, `Navigation.tsx`
- [ ] 13.2 `isEssayComplete` and `essayProgress`, plus the data reconciliation
- [ ] 13.3 `web/src/utils/deadline.ts`
- [ ] 13.4 `web/src/utils/deriveNextAction.ts`
- [ ] 13.5 `DeadlineRadar.tsx`
- [ ] 13.6 `ActionRow.tsx` then `ActionFeed.tsx`
- [ ] 13.7 `ReadyToStart.tsx`
- [ ] 13.8 `ApplicationPanel.tsx` with the editable essays section
- [ ] 13.9 `GridView.tsx` adapted from the old table
- [ ] 13.10 `ViewToggle.tsx`
- [ ] 13.11 `Dashboard.tsx` full refactor
- [ ] 13.12 Retire the Edit Application page

---

## [ ] 14. Files Changed Summary

### [ ] 14.1 Files to create

- [ ] 14.1.1 `version.txt`
- [ ] 14.1.2 `web/src/utils/deadline.ts`
- [ ] 14.1.3 `web/src/utils/deriveNextAction.ts`
- [ ] 14.1.4 `web/src/components/DeadlineRadar.tsx`
- [ ] 14.1.5 `web/src/components/ActionRow.tsx`
- [ ] 14.1.6 `web/src/components/ActionFeed.tsx`
- [ ] 14.1.7 `web/src/components/ReadyToStart.tsx`
- [ ] 14.1.8 `web/src/components/ApplicationPanel.tsx`
- [ ] 14.1.9 `web/src/components/GridView.tsx`
- [ ] 14.1.10 `web/src/components/ViewToggle.tsx`

### [ ] 14.2 Files to modify

- [ ] 14.2.1 `web/vite.config.ts` to inject version
- [ ] 14.2.2 `web/src/vite-env.d.ts` to add `VITE_APP_VERSION`
- [ ] 14.2.3 `web/src/components/Navigation.tsx` for the version badge
- [ ] 14.2.4 `web/src/pages/Dashboard.tsx` for the full refactor
- [ ] 14.2.5 Essay completion logic wherever it currently lives, consolidated to one predicate
- [ ] 14.2.6 Dashboard data hooks or API callers if they currently omit essay metadata
  needed by `essayProgress`

### [ ] 14.3 Files to remove

- [ ] 14.3.1 The separate Edit Application page, replaced by `ApplicationPanel`
