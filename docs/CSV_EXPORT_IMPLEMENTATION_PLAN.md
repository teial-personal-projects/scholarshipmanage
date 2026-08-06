# Scholarship Application CSV Export Implementation Plan

## Overview

This feature lets an authenticated user download their scholarship application
list as a CSV file stored locally on their computer. The export is generated in
the browser from application data that has already been loaded by the dashboard,
so the initial version does not require a new API endpoint, database migration,
server-side file storage, or third-party service.

The downloaded file reflects the grid's current search, status filter, due-date
filter, and sort order. It includes every matching application rather than only
the ten applications on the visible pagination page. This makes the export
predictable: the user narrows and orders the grid, selects **Export CSV**, and
receives the same result set in a spreadsheet-compatible file.

The initial version uses a fixed, useful set of columns rather than introducing
record-selection or column-selection controls. The implementation must handle
commas, quotation marks, line breaks, Unicode text, null values, and spreadsheet
formula injection safely. It should remain a frontend-only feature unless
codebase findings during implementation show that the browser does not have all
required application fields.

## Feature Definition

### User Story

As a scholarship applicant, you can download the applications matching your
current grid view as a CSV file so that you can keep a local backup, work with
the list in a spreadsheet, or share it outside ScholarshipManage.

### Problem Statement

ScholarshipManage currently keeps the user's application list inside the
product. A user cannot create a portable local copy for offline review,
spreadsheet analysis, personal backup, or sharing without manually copying
individual application details.

### Solution Statement

Add an **Export CSV** action to `GridView`. When selected, the action converts
the complete filtered and sorted application result set into a safe,
spreadsheet-compatible CSV document and triggers a local browser download.
Reusable CSV serialization and download behavior live in a focused utility
with unit tests; application-specific column mapping remains close to the grid.

### Feature Metadata

| Attribute | Value |
| --- | --- |
| Feature type | Frontend enhancement |
| Estimated complexity | Small |
| Primary workspace | `web` |
| API changes | None expected |
| Database changes | None |
| New runtime dependency | None expected |
| Authentication changes | None |
| Estimated implementation time | Half a day to one day |

### Initial Export Contract

The CSV columns appear in this fixed order:

| CSV heading | Application source | Empty-value behavior |
| --- | --- | --- |
| Scholarship Name | `scholarshipName` | Empty string |
| Organization | Derived organization label | Empty string |
| Status | `status` | Empty string |
| Due Date | `dueDate` | Empty string |
| Minimum Award | `minAward` | Empty string |
| Maximum Award | `maxAward` | Empty string |
| Required Essays | Total number of related essays | `0` |
| Recommendation Count | `recommendationCount` | Empty string |
| Current Dependencies | Derived pending-work labels | Empty string |
| Organization Website | `orgWebsite` | Empty string |
| Submission Date | `submissionDate` | Empty string |
| Last Updated | `updatedAt` | Empty string |

Dates use the existing timezone-safe display format. Award columns contain raw
numeric values without currency symbols or thousands separators so spreadsheet
software recognizes them as numbers. Required Essays is the total number of
essay records related to the application, including completed essays. Current
Dependencies is a single readable cell containing only unfinished work, with
labels joined by a comma and space; for example,
`Essays 2 left, Recs 1 pending, Essay feedback pending`. The cell is empty when
no work is pending. The export excludes internal identifiers, `userId`,
requirements, application links, essay content, collaborator identity, and
other fields that are either implementation details or unsuitable for a
concise list export.

## Guiding Rules

- Export `sortedApplications`, never `pageApplications`, so pagination does not
  silently truncate the file.
- Apply the grid's current search, status, due-date, and sort state exactly as
  displayed when the user starts the export.
- Generate and download the CSV entirely in the browser; do not send export
  contents to a new server or third party.
- Keep generic CSV concerns separate from scholarship-specific field mapping.
- Encode every cell according to CSV quoting rules and neutralize values that
  spreadsheet programs could interpret as formulas.
- Include a UTF-8 byte-order mark so Unicode content opens reliably in common
  versions of Microsoft Excel.
- Use the existing date, organization-label, pending-work, toast, button, and
  `lucide-react` patterns.
- Do not add a package unless implementation proves the native browser approach
  insufficient and the user approves the dependency.
- Write behavior-focused tests before considering a phase complete.
- Preserve unrelated working-tree changes.

## Context to Read Before Implementation

- `AGENTS.md` for repository architecture, commands, and validation rules.
- `shared/src/types/api-responses.types.ts:56` for the complete
  `ApplicationResponse` contract.
- `web/src/components/GridView.tsx:14` for component inputs and grid-owned
  state.
- `web/src/components/GridView.tsx:109` for existing display formatting and
  derived dependency labels.
- `web/src/components/GridView.tsx:156` for status, search, and due-date filter
  behavior.
- `web/src/components/GridView.tsx:283` for the filtered, sorted, and paginated
  application collections.
- `web/src/components/GridView.tsx:390` for the filter toolbar and intended
  export-action placement.
- `web/src/components/GridView.test.tsx:17` for application fixtures and
  component-test conventions.
- `web/src/utils/applicationOrganization.ts` for the organization fallback
  shown to users.
- `web/src/utils/pendingWork.ts` for the derived dependency labels.
- `shared/src/types/essay.types.ts:17` for the existing essay total and
  completed-count derivation.
- `web/src/utils/date.ts:36` for timezone-safe date formatting.
- `web/src/utils/toast.ts:4` for success and error feedback.
- `web/package.json` to confirm no existing CSV dependency is available or
  required.

## New Files to Create

- `web/src/utils/csv.ts` containing generic cell escaping, document
  serialization, filename construction or download behavior, and exported
  types needed by callers.
- `web/src/utils/csv.test.ts` containing focused unit tests for serialization,
  safety, encoding, and browser-download behavior.

Do not create an API route, service, schema, migration, or shared-package type
for the initial version.

## Patterns to Follow

- Follow `web/src/utils/date.ts` by implementing small, typed, deterministic
  utility functions with explicit handling for null or invalid inputs.
- Follow `web/src/components/GridView.test.tsx` by testing behavior through
  accessible labels and visible actions rather than component internals.
- Use `useToastHelpers` for export success and failure messages.
- Use the existing `btn-ghost` or a visually compatible secondary-action
  button and a `lucide-react` download icon; do not add a custom SVG.
- Revoke generated object URLs after the download is initiated to avoid
  retaining Blob data in memory.

## [ ] Phase 1: Confirm the Export Contract

**Goal:** Establish an unambiguous, testable definition of what the first CSV
export contains and how it behaves.

**Working artifact:** An agreed export contract reflected in test cases before
UI wiring begins.

### 1.1 Confirm Scope and Result-Set Behavior

- [ ] 1.1.1 Confirm that **Export CSV** is available in the grid view and
  exports the current filtered and sorted result set.
- [ ] 1.1.2 Confirm that the result includes all matching applications across
  every pagination page, not only the current page.
- [ ] 1.1.3 Confirm that the initial release uses the fixed columns listed in
  the Initial Export Contract and does not include column-selection or
  row-selection UI.
- [ ] 1.1.4 Confirm that an empty result set cannot be exported and that the
  action clearly communicates its disabled state.

### 1.2 Confirm Data Formatting

- [ ] 1.2.1 Confirm that date-only fields use
  `formatDateNoTimezone` and missing dates become empty cells rather than
  `N/A` or `-`.
- [ ] 1.2.2 Confirm that `updatedAt` is converted to a user-readable,
  timezone-safe date value rather than exported as an opaque timestamp.
- [ ] 1.2.3 Confirm that award amounts and recommendation counts remain raw
  numeric cells when present.
- [ ] 1.2.4 Confirm that Required Essays is the total number of essay records,
  not only the number of unfinished essays.
- [ ] 1.2.5 Confirm that dependency labels are joined with a comma and space
  inside one properly quoted CSV cell.
- [ ] 1.2.6 Confirm that Organization Website exports `orgWebsite` and that
  Application Link is not part of the initial CSV contract.
- [ ] 1.2.7 Confirm that the file name follows
  `scholarship-applications-YYYY-MM-DD.csv` using the user's local calendar
  date.

### Phase 1 Completion Criteria

- [ ] 1.3.1 Every CSV heading maps to one documented application or derived
  value.
- [ ] 1.3.2 The expected behavior for filters, sorting, pagination, nulls,
  dates, numeric values, and the filename is unambiguous.
- [ ] 1.3.3 No backend or database work is required by the approved contract.

## [ ] Phase 2: Build and Test the CSV Utility

**Goal:** Provide a reusable utility that safely converts typed rows into a CSV
document and initiates a local browser download.

**Working artifact:** A passing `csv.test.ts` suite and a utility ready for
application-specific data.

### 2.1 Define the Utility Interface

- [ ] 2.1.1 Create `web/src/utils/csv.ts` with typed inputs for ordered column
  headings and row values.
- [ ] 2.1.2 Keep CSV serialization deterministic and independent from React,
  application filtering, or scholarship domain types.
- [ ] 2.1.3 Separate pure CSV string generation from the browser side effect
  that creates and activates the download.
- [ ] 2.1.4 Accept only supported scalar or nullish cell values and convert
  them consistently to strings during serialization.

### 2.2 Implement Standards-Compliant Serialization

- [ ] 2.2.1 Escape embedded double quotes by doubling them.
- [ ] 2.2.2 Quote cells containing commas, double quotes, carriage returns, or
  line feeds.
- [ ] 2.2.3 Preserve Unicode characters and prepend a UTF-8 byte-order mark to
  the downloadable document.
- [ ] 2.2.4 Use a consistent line ending accepted by Excel, Numbers, Google
  Sheets, and common CSV readers.
- [ ] 2.2.5 Represent `null` and `undefined` as empty cells without emitting the
  literal text `null` or `undefined`.

### 2.3 Mitigate Spreadsheet Formula Injection

- [ ] 2.3.1 Treat user-controlled text beginning with `=`, `+`, `-`, `@`, tab,
  or carriage return as potentially executable spreadsheet content.
- [ ] 2.3.2 Neutralize risky text values using one documented and tested
  strategy while leaving genuine numeric values numeric.
- [ ] 2.3.3 Apply the mitigation before normal CSV quoting so both safety and
  CSV syntax remain correct.

### 2.4 Implement the Browser Download

- [ ] 2.4.1 Create the CSV Blob with an appropriate CSV MIME type and UTF-8
  charset.
- [ ] 2.4.2 Create a temporary object URL and temporary anchor carrying the
  desired filename.
- [ ] 2.4.3 Activate the anchor programmatically without navigating away from
  the dashboard.
- [ ] 2.4.4 Remove temporary DOM state and revoke the object URL after the
  download is initiated.
- [ ] 2.4.5 Allow download failures to propagate so the caller can show an
  error toast.

### 2.5 Add Unit Coverage

- [ ] 2.5.1 Test plain headings and values.
- [ ] 2.5.2 Test commas, quotes, multiline text, Unicode, empty strings, null,
  and undefined.
- [ ] 2.5.3 Test formula-injection prefixes, including values with leading
  whitespace where applicable to the chosen mitigation.
- [ ] 2.5.4 Test that numbers remain valid numeric cells.
- [ ] 2.5.5 Test the byte-order mark and agreed line endings.
- [ ] 2.5.6 Mock Blob URLs and anchor activation to verify the filename,
  download initiation, cleanup, and URL revocation.

### Phase 2 Completion Criteria

- [ ] 2.6.1 The utility produces a valid CSV for every documented edge case.
- [ ] 2.6.2 A malicious scholarship or organization value opens as inert text
  rather than a spreadsheet formula.
- [ ] 2.6.3 The utility initiates one local download and releases its temporary
  browser resources.
- [ ] 2.6.4 `npm test --workspace=@scholarshipmanage/web -- csv` passes.

## [ ] Phase 3: Map Applications to Export Rows

**Goal:** Convert the grid's complete sorted result set into the approved CSV
contract without duplicating presentation logic unnecessarily.

**Working artifact:** A deterministic application-to-CSV mapping covered by
tests.

### 3.1 Define the Application Export Columns

- [ ] 3.1.1 Define the fixed ordered column configuration near `GridView` or in
  a focused application-export module if the mapping would make `GridView.tsx`
  harder to maintain.
- [ ] 3.1.2 Use `getApplicationOrganizationLabel` so the export matches the
  organization fallback users see in the grid.
- [ ] 3.1.3 Reuse the pending-work derivation used by
  `getCurrentDependenciesLabel` rather than implementing a second definition
  of dependencies.
- [ ] 3.1.4 Use the total returned by `essayProgress` for Required Essays so
  completed and unfinished essay records are both counted.
- [ ] 3.1.5 Map Organization Website from `orgWebsite` without falling back to
  `applicationLink`.
- [ ] 3.1.6 Reuse the existing timezone-safe date helper and translate missing
  display placeholders to empty export cells.
- [ ] 3.1.7 Keep award and count values numeric and preserve zero as a real
  value rather than treating it as missing.

### 3.2 Connect the Correct Result Set

- [ ] 3.2.1 Pass `sortedApplications` to the export mapping so current search,
  status, due-date, and sort behavior is preserved.
- [ ] 3.2.2 Do not use `pageApplications`, because it contains only the visible
  ten-row page.
- [ ] 3.2.3 Verify that programmatic dashboard metric filters flow through the
  same grid state before export.
- [ ] 3.2.4 Build the filename using the local date without relying on a UTC
  conversion that could produce the previous or next calendar day.

### 3.3 Test the Mapping

- [ ] 3.3.1 Test every agreed heading and its column order.
- [ ] 3.3.2 Test populated and missing optional application fields.
- [ ] 3.3.3 Test the Required Essays total with completed and unfinished
  essays.
- [ ] 3.3.4 Test the exact combined dependency text for essay,
  recommendation, and essay-review work.
- [ ] 3.3.5 Test populated and missing organization websites and confirm an
  application link is not substituted.
- [ ] 3.3.6 Test derived organization and dependency values.
- [ ] 3.3.7 Test date and numeric formatting independently from DOM download
  mechanics where possible.

### Phase 3 Completion Criteria

- [ ] 3.4.1 A representative application produces the exact approved headings
  and row values.
- [ ] 3.4.2 Missing optional fields produce empty cells without losing column
  alignment.
- [ ] 3.4.3 The export order matches `sortedApplications` and contains more
  than one page when more than ten records match.

## [ ] Phase 4: Add the Grid Export Experience

**Goal:** Give users an accessible, responsive, and clearly communicated way to
download the current grid result.

**Working artifact:** A functioning **Export CSV** action in `GridView`.

### 4.1 Add the Export Action

- [ ] 4.1.1 Import the existing `Download` icon from `lucide-react`.
- [ ] 4.1.2 Add an **Export CSV** button to the grid controls near **Reset**,
  keeping filter controls usable at mobile, tablet, and desktop widths.
- [ ] 4.1.3 Use `type="button"`, visible button text, an accessible name, and
  existing focus styles.
- [ ] 4.1.4 Disable the button when `sortedApplications` is empty and ensure
  the disabled styling remains legible.
- [ ] 4.1.5 Keep the button available regardless of the current pagination
  page.

### 4.2 Wire Export Feedback

- [ ] 4.2.1 Add `showSuccess` to the existing toast helper destructuring.
- [ ] 4.2.2 On success, show a concise message containing the number of
  applications exported.
- [ ] 4.2.3 On failure, show an actionable error message and leave grid state
  unchanged so the user can retry.
- [ ] 4.2.4 Do not show a success toast until CSV creation and download
  initiation complete without throwing.

### 4.3 Preserve Existing Grid Behavior

- [ ] 4.3.1 Confirm that adding the action does not change the default Active
  filter, sorting cycle, filter counts, custom date range, or pagination.
- [ ] 4.3.2 Confirm that selecting **Reset** still resets only grid controls and
  does not trigger a download.
- [ ] 4.3.3 Confirm that the export action does not open an application, submit
  a form, scroll the page, or modify server data.

### Phase 4 Completion Criteria

- [ ] 4.4.1 A user can select **Export CSV** and receive one locally downloaded
  file with the expected name.
- [ ] 4.4.2 The success message reports the same number of rows present in the
  file.
- [ ] 4.4.3 With no matching applications, the export action is disabled and
  no empty file is downloaded.
- [ ] 4.4.4 The toolbar remains usable without horizontal overflow at supported
  viewport widths.

## [ ] Phase 5: Verify End-to-End Behavior

**Goal:** Prove that the exported file matches the user's grid state and opens
correctly in common spreadsheet software.

**Working artifact:** Passing automated validation plus a manually inspected
CSV opened in at least one spreadsheet application.

### 5.1 Add Grid Integration Tests

- [ ] 5.1.1 Extend `web/src/components/GridView.test.tsx` to verify that the
  export action is present and enabled for a non-empty result.
- [ ] 5.1.2 Verify that search filtering excludes nonmatching applications
  from the downloaded rows.
- [ ] 5.1.3 Verify that status and due-date filters affect the downloaded rows.
- [ ] 5.1.4 Verify that the selected sort order determines CSV row order.
- [ ] 5.1.5 Create more than `ITEMS_PER_PAGE` matching fixtures and verify that
  all are exported from any visible pagination page.
- [ ] 5.1.6 Verify that no matching results disables the action.
- [ ] 5.1.7 Verify success and failure toast behavior.

### 5.2 Run Automated Validation

- [ ] 5.2.1 Run the focused CSV utility tests.
- [ ] 5.2.2 Run the focused GridView tests.
- [ ] 5.2.3 Run the web workspace type check.
- [ ] 5.2.4 Run the web workspace lint command.
- [ ] 5.2.5 Run the complete web workspace test suite if focused checks pass.
- [ ] 5.2.6 Run the web production build to catch bundling or browser-global
  issues.

Use these commands:

```bash
npm test --workspace=@scholarshipmanage/web -- csv
npm test --workspace=@scholarshipmanage/web -- GridView
npm run type-check --workspace=@scholarshipmanage/web
npm run lint --workspace=@scholarshipmanage/web
npm test --workspace=@scholarshipmanage/web
npm run build --workspace=@scholarshipmanage/web
```

### 5.3 Perform Manual Acceptance Testing

- [ ] 5.3.1 Create or use applications containing commas, quotation marks,
  multiline text, Unicode characters, URLs, missing values, zero amounts, and
  formula-like text.
- [ ] 5.3.2 Apply a search, status filter, due-date filter, and nondefault sort,
  then download the CSV.
- [ ] 5.3.3 Open the file in Microsoft Excel, Apple Numbers, Google Sheets, or
  LibreOffice Calc and verify headings, row order, Unicode, numeric cells,
  dates, and multiline fields.
- [ ] 5.3.4 Confirm the file contains every matching application across
  pagination and no application excluded by the active filters.
- [ ] 5.3.5 Confirm formula-like input is displayed as inert text and does not
  execute.
- [ ] 5.3.6 Repeat the export at a narrow mobile viewport and confirm the
  control remains visible and operable.

### Phase 5 Completion Criteria

- [ ] 5.4.1 All focused and workspace-level automated checks pass.
- [ ] 5.4.2 The production build succeeds without a new dependency.
- [ ] 5.4.3 The downloaded file opens cleanly in a spreadsheet application and
  matches the active grid result.
- [ ] 5.4.4 Existing grid filtering, sorting, pagination, editing, and deletion
  behavior remain unchanged.

## Risks and Mitigations

- Exporting `pageApplications` would silently limit the file to ten rows.
  Export `sortedApplications` and test with more than ten fixtures.
- User-controlled text could execute as a spreadsheet formula. Neutralize
  dangerous prefixes before CSV quoting and test each prefix.
- Incorrect escaping could shift columns or split rows. Centralize escaping and
  test commas, quotes, CRLF, and multiline values.
- Timezone conversion could shift dates by one day. Reuse timezone-safe date
  helpers and generate the filename from local date parts.
- Unicode names could display incorrectly in Excel. Include a UTF-8 byte-order
  mark and manually open a Unicode fixture.
- Repeated exports could retain Blob memory. Revoke each temporary object URL
  after download activation.
- Export logic could diverge from the visible grid. Export the existing derived
  `sortedApplications` collection.
- Additional controls could crowd small screens. Follow existing responsive
  grid patterns and manually test narrow viewports.
- An overly broad export could expose sensitive or noisy data. Use a fixed
  allowlist of user-facing columns.

## Out of Scope for the Initial Version

- Importing CSV data back into ScholarshipManage.
- Selecting individual application rows before export.
- Choosing, reordering, or renaming export columns.
- Exporting essay text, collaborator personal information, recommendation
  content, attachments, or audit history.
- Server-generated files, scheduled exports, cloud storage, or emailed exports.
- XLSX, PDF, JSON, or other export formats.
- A separate API endpoint or database audit record for downloads.

## Future Enhancements

- Add a choice between the current filtered results and all applications.
- Allow users to select optional columns and save export presets.
- Export related essays or recommendations as separate CSV files.
- Provide an XLSX workbook with multiple sheets and native date or currency
  cell formats.
- Add CSV import with preview, validation, duplicate detection, and explicit
  confirmation.
