# Test Report — Policy Extractor

**Date:** 2026-11-26  
**Test Runner:** Vitest v2.1.9 (`jsdom` environment)  
**Command:** `npm test` (`vitest run`)  
**Result:** **12 test files passed, 308 tests passed, 0 failed**  
**Build Check:** `npm run build` (`vite build`) — **passed**

All automated tests use **synthetic data only**. No real policyholder data or confidential portal information is used anywhere in the test suite.

---

## Bug Fixes Discovered During Testing

1. **Wildcard host-pattern matching bug in `src/extraction/adapter.js`**  
   - **Root cause:** `matchesPattern()` escaped `[.+?^${}()|[\]\\]` (which does not escape `*`), and then attempted `.replace(/\\\*/g, '[^/]+')`. Because `*` was not escaped to `\*`, the wildcard was never replaced with `[^/]+`, causing patterns like `https://*.example.com` to fail matching `https://portal.example.com`.  
   - **Fix:** Updated `.replace(/\\\*/g, '[^/]+')` to `.replace(/\*/g, '[^/]+')` and exported `matchesPattern` so `tests/extraction.test.js` tests the production function directly.  
   - **Regression test:** `tests/extraction.test.js` (`§1 Adapter host-pattern matching`).

2. **Testability exports in `src/export/printTemplate.js`**  
   - **Improvement:** Exported `buildPrintHTML` and `buildRecordHTML` so `tests/print.test.js` executes directly against the production HTML-generation functions rather than a duplicated copy.

---

## Scenario-by-Scenario Report (`edge-cases.md`)

### §1. Extraction and page structure

| Scenario | Test Type | Status | Result / Notes |
|---|---|---|---|
| Page contains all configured fields in the expected structure | Automated / Manual | PASS | Verified with synthetic two-column table adapter in `tests/extraction.test.js` and placeholder adapter in `tests/adapter.test.js`. Real portal verification awaits authorized page HTML. |
| One or more configured fields are missing | Automated | PASS | Verified in `tests/extraction.test.js` — absent fields return `undefined` without throwing. |
| Fields are present but empty or whitespace-only | Automated | PASS | Verified in `tests/extraction.test.js` (empty cell) and `tests/validation.test.js` (whitespace-only required field flagged). |
| Labels have minor wording, capitalization, punctuation, or spacing changes | Manual | NOT IMPLEMENTED | Depends on real portal adapter implementation (Milestone 4b). |
| Values appear more than once; verify the intended occurrence is selected | Manual | NOT IMPLEMENTED | Depends on real portal selectors (Milestone 4b). |
| A field's value is split across DOM nodes | Automated | PASS | Verified in `tests/extraction.test.js` (`<span>SYNTH</span><span>-003</span>` concatenated via `textContent`). |
| Text contains extra whitespace, line breaks, tabs, or non-breaking spaces | Automated | PASS | Verified in `tests/extraction.test.js`, `tests/normalize.test.js`, and `tests/validation.test.js`. |
| Page is still loading when extraction is invoked | Manual | NOT IMPLEMENTED | Requires live Chrome tab timing test against a slow-loading portal page. |
| Page content changes after extraction begins | Manual | NOT IMPLEMENTED | Requires live Chrome tab test (DOM mutation during extraction). |
| The user invokes extraction on an unsupported page | Automated / Manual | PASS | Popup error handling verified in `tests/ui.test.jsx` (`shows clear error when popup is opened on unsupported/disconnected page`). Live Chrome tab check pending manual test. |
| The extension is invoked on a domain outside the approved host list | Automated / Manual | PASS | `getAdapter()` fallback to placeholder verified in `tests/extraction.test.js`; `manifest.json` host restriction audited in `tests/security-extended.test.js`. Live Chrome enforcement pending manual test. |
| The page contains unrelated or hidden content; verify it is not collected | Automated / Manual | PASS | Placeholder adapter only returns configured `FIELD_DEFS` keys (`tests/extraction.test.js`). Real DOM selector scoping awaits Milestone 4b. |
| Extraction is invoked repeatedly; verify no accidental duplicate is saved | Automated / Manual | PASS | Extraction does not write to storage; saving requires manual ReviewForm submit and duplicate `policyNumber` check blocks duplicate save (`tests/ui.test.jsx`, `tests/workflow.test.js`). |
| Portal page content includes text resembling instructions, scripts, markup, or malicious input; verify it is treated as data only | Automated | PASS | Verified in `tests/extraction.test.js`, `tests/security.test.js`, and `tests/security-extended.test.js`. |

### §2. Data validation and normalization

| Scenario | Test Type | Status | Result / Notes |
|---|---|---|---|
| Names with accents, non-Latin characters, initials, apostrophes, and hyphens | Automated | PASS | 11 cases verified in `tests/validation.test.js` (Spanish, French, Cyrillic, CJK, Arabic, Nordic, apostrophes, hyphens, initials). |
| Long names or addresses | Automated | PASS | Boundary checks at `maxLength` (150 for `policyHolder`, 1000 for `notes`) and `maxLength + 1` rejection verified in `tests/validation.test.js`. |
| Leading zeros in policy numbers or other identifiers | Automated | PASS | Verified in `tests/validation.test.js` (`00000001`, `000123`) and `tests/export.test.js`. |
| IDs containing letters, spaces, hyphens, or punctuation | Automated | PASS | Verified in `tests/validation.test.js` (`POL-0000-001`, `AB/2024/0001`, `P00001.A`, etc.). |
| Date formats such as DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, ambiguous dates, and invalid dates | Automated | PASS | 16 cases in `tests/validation.test.js` and 10 in `tests/normalize.test.js` (leap year, Feb 29/30, Apr 31, month > 12, invalid strings, NBSP). |
| Currency values with commas, decimals, currency symbols, or whitespace | Automated | PASS | 13 cases in `tests/validation.test.js` and 8 in `tests/normalize.test.js` (`£`, `$`, `€`, `₹`, commas, decimals, whitespace). |
| Negative, zero, very large, or malformed numeric values | Automated | PASS | Verified in `tests/validation.test.js` (`0`, `-500`, `10000000`, `N/A`, `1.2.3`, `approx 1000`). |
| Values that exceed configured length limits | Automated | PASS | Verified in `tests/validation.test.js` and `tests/schema.test.js`. |
| Unicode whitespace and unusual but valid characters | Automated | PASS | Verified in `tests/validation.test.js` (`U+00A0`, `U+200B`, `U+200C`, `U+FEFF`). |
| Invalid values should be flagged, not silently rewritten into a plausible value | Automated | PASS | Verified in `tests/validation.test.js` (invalid dates/currencies return `null`; whitespace-only required fields fail validation without mutation). |
| Missing required values prevent confirmation or are clearly flagged according to requirements | Automated | PASS | Verified in `tests/validation.test.js` and `tests/ui.test.jsx` (`ReviewForm` blocks submit and displays field error). |

### §3. Review and save workflow

| Scenario | Test Type | Status | Result / Notes |
|---|---|---|---|
| User edits a field before saving | Automated | PASS | Verified in `tests/workflow.test.js` (`updateRecord` updates and validates corrected fields). |
| User discards the extracted result | Automated | PASS | Verified in `tests/ui.test.jsx` (clicking `Discard` calls `onDiscard` without calling `db.records.add`) and `tests/workflow.test.js`. |
| User closes the popup during review | Manual | NOT IMPLEMENTED | Requires manual Chrome extension popup test (verify no partial record is saved). |
| User cancels a save | Automated | PASS | Verified via `Discard` flow in `tests/ui.test.jsx` and edit modal cancel in `Dashboard.jsx` (manual for edit modal). |
| Save is clicked twice rapidly | Automated | PASS | Double-save guard logic verified in `tests/workflow.test.js` (mirrors `saveGuard` ref in `ReviewForm.jsx`). |
| Storage fails or quota is exceeded | Automated | PASS | `QuotaExceededError` handling verified in `tests/ui.test.jsx` (displays `"Storage is full..."` and does not call `onSaved`). |
| Save succeeds but the UI is interrupted before showing confirmation | Manual | NOT IMPLEMENTED | Requires manual interruption test in Chrome popup/IndexedDB. |
| Record is saved with optional fields missing | Automated | PASS | Verified in `tests/workflow.test.js` and `tests/schema.test.js`. |
| Duplicate policy number: warn and offer a deliberate resolution rather than silently overwrite | Automated | PASS | Verified in `tests/ui.test.jsx` (`warns on duplicate policyNumber instead of overwriting`) and `tests/workflow.test.js`. |
| User edits a previously saved record | Automated | PASS | Verified in `tests/workflow.test.js` (`updateRecord` preserves `id`, updates fields, validates). |
| User deletes a record; require confirmation and handle cancellation | Automated | PASS | Verified in `tests/ui.test.jsx` (clicking `Delete` opens `role="dialog"` confirmation modal; clicking `Cancel` aborts deletion). |
| Search/filter state remains understandable after editing or deletion | Manual | NOT IMPLEMENTED | Requires interactive Dashboard test with live IndexedDB reload after edit/delete. |

### §4. Storage, migration and backup

| Scenario | Test Type | Status | Result / Notes |
|---|---|---|---|
| Empty database on first launch | Automated | PASS | Empty `Dashboard` state verified in `tests/ui.test.jsx`; empty backup validation verified in `tests/backup.test.js`. |
| Large collection of records | Automated | PASS | 100-record backup round-trip verified in `tests/backup.test.js`; 200-record export verified in `tests/export.test.js`. Live IndexedDB performance with 1,000+ records is manual. |
| Database unavailable, corrupted, or quota-limited | Automated / Manual | PASS | `QuotaExceededError` in `ReviewForm` verified in `tests/ui.test.jsx`. Corrupted IndexedDB recovery requires manual browser test. |
| Extension upgrade with an older database schema | Manual | NOT IMPLEMENTED | Currently at schema v1; requires manual upgrade test when v2 is introduced. |
| Backup from a supported older schema version | Automated | PASS | Verified in `tests/backup.test.js` (`accepts supported older schema version`). |
| Backup with an unknown schema version | Automated | PASS | Verified in `tests/backup.test.js` (`rejects schema version higher than current`) and `tests/schema.test.js`. |
| Malformed JSON backup | Automated | PASS | Verified in `tests/backup.test.js` (`null`, string, number, non-array `records`). |
| Backup with missing fields, wrong types, excessive field lengths, or invalid dates | Automated | PASS | 5 cases verified in `tests/backup.test.js`. |
| Backup contains duplicate IDs | Automated | PASS | Verified in `tests/backup.test.js` and `tests/schema.test.js`. |
| Import contains records matching existing records | Automated | PASS | Duplicate `skip` and `overwrite` strategies verified in `tests/backup.test.js`. |
| Import is cancelled partway through or fails | Manual | NOT IMPLEMENTED | Requires manual test with `BackupPanel` UI + IndexedDB transaction rollback. |
| Restore must not silently overwrite existing data | Automated | PASS | Default `skip` strategy leaves existing records untouched (`tests/backup.test.js`); `BackupPanel` requires explicit user radio selection and confirmation. |
| Export and restore round-trip preserves supported data | Automated | PASS | JSON serialization + `validateImport` round-trip with Unicode & special chars verified in `tests/backup.test.js`. |
| Storage migration failure leaves existing data recoverable | Manual | NOT IMPLEMENTED | Requires manual IndexedDB migration failure simulation. |

### §5. PDF and document extraction

| Scenario | Test Type | Status | Result / Notes |
|---|---|---|---|
| PDF contains selectable text | Manual | NOT IMPLEMENTED | PDF.js extraction is not yet implemented (deferred until authorized PDF workflow is required). |
| PDF is image-only/scanned | Manual | NOT IMPLEMENTED | Deferred with PDF.js support. |
| PDF has multiple pages | Manual | NOT IMPLEMENTED | Deferred with PDF.js support. |
| PDF is rotated or has unusual page dimensions | Manual | NOT IMPLEMENTED | Deferred with PDF.js support. |
| PDF is malformed or password-protected | Manual | NOT IMPLEMENTED | Deferred with PDF.js support. |
| PDF has no relevant fields | Manual | NOT IMPLEMENTED | Deferred with PDF.js support. |
| PDF text order differs from visual order | Manual | NOT IMPLEMENTED | Deferred with PDF.js support. |
| PDF contains text with unusual Unicode characters | Manual | NOT IMPLEMENTED | Deferred with PDF.js support. |
| PDF is unusually large; verify graceful performance and limits | Manual | NOT IMPLEMENTED | Deferred with PDF.js support. |
| Extraction fails; do not falsely report success or save misleading data | Manual | NOT IMPLEMENTED | Deferred with PDF.js support. |

### §6. Excel/CSV export

| Scenario | Test Type | Status | Result / Notes |
|---|---|---|---|
| Export empty selection | Automated | PASS | Verified in `tests/export.test.js` for both JSON and XLSX row builders. |
| Export a single record | Automated | PASS | Verified in `tests/export.test.js`. |
| Export a large selection | Automated | PASS | 100-record JSON and 200-record XLSX row builder verified in `tests/export.test.js`. |
| Fields contain commas, quotes, line breaks, or Unicode | Automated | PASS | Verified in `tests/export.test.js`. |
| Identifier values contain leading zeros | Automated | PASS | Verified in `tests/export.test.js` (`00042` preserved as string). |
| Cells contain formula-like prefixes (`=`, `+`, `-`, `@`); verify formula injection mitigation | Automated | PASS | Verified in `tests/export.test.js`, `tests/normalize.test.js`, `tests/security.test.js`, and `tests/security-extended.test.js` (also covers `\t`, `\r`). |
| User selects only some fields for export | Automated | PASS | Subset `fieldIds` filtering verified in `tests/export.test.js`. |
| Export filename avoids sensitive values by default | Automated | PASS | Verified generic filenames (`policy-records.json`, `policy-records.xlsx`) in `tests/export.test.js`. |
| Export failure or cancellation is handled clearly | Manual | NOT IMPLEMENTED | Requires manual browser download cancellation / permission failure test. |
| Exported columns, headers, dates, and numeric formats are consistent | Automated | PASS | Header order and column consistency verified in `tests/export.test.js`. Opening generated `.xlsx` in Excel/LibreOffice is recommended as a manual check. |

### §7. Print/PDF output

| Scenario | Test Type | Status | Result / Notes |
|---|---|---|---|
| Single-record output | Automated | PASS | Verified against `buildPrintHTML` in `tests/print.test.js`. |
| Multiple records and page breaks | Automated | PASS | Verified `<div class="page-break"></div>` insertion in `tests/print.test.js`. |
| Long names, addresses, and text values | Automated | PASS | Verified no truncation in `tests/print.test.js`. |
| Empty optional fields | Automated | PASS | Verified `—` placeholder and no `undefined`/`null` text in `tests/print.test.js`. |
| Missing required fields | Automated | PASS | `buildRecordHTML` renders `—` safely without throwing if a field is empty. |
| Very large values and wrapping | Automated / Manual | PASS | Value rendering verified in `tests/print.test.js`; visual word-wrapping in print preview is manual. |
| Print preview at A4 and alternative paper sizes if supported | Manual | NOT IMPLEMENTED | Requires manual Chrome Print Preview check. |
| Margins, page breaks, headers and footers | Manual | NOT IMPLEMENTED | Requires manual Chrome Print Preview check. |
| Print output excludes UI controls and unwanted metadata | Automated | PASS | Verified no `<button>` or `<input>` elements in `buildPrintHTML` output (`tests/print.test.js`). |
| Print HTML safely escapes special characters and hostile markup | Automated | PASS | Verified `<script>`, `&`, `<`, `>`, `"`, `'` escaping in `tests/print.test.js`. |
| PDF generation failure is handled without claiming success | Manual | NOT IMPLEMENTED | `printRecords()` alerts when `window.open` is blocked; full print-to-PDF failure requires manual browser check. |

### §8. Permissions and security

| Scenario | Test Type | Status | Result / Notes |
|---|---|---|---|
| Permission is denied or revoked | Manual | NOT IMPLEMENTED | Requires manual Chrome `chrome://extensions` site-access toggle test. |
| Extension is installed but has not been granted host access | Automated / Manual | PASS | `manifest.json` uses placeholder host permission; popup error handling verified in `tests/ui.test.jsx`. Live Chrome check pending manual test. |
| Attempt to run on a non-approved domain | Automated / Manual | PASS | `manifest.json` audited in `tests/security-extended.test.js` (no `<all_urls>` or `*://*/*`). Live Chrome check pending manual test. |
| Extension receives malformed messages | Automated | PASS | `content.js` message guard (`EXTRACT_FIELDS` only) verified in `tests/security-extended.test.js`. |
| Page content includes HTML-like strings or script-like payloads | Automated | PASS | Verified in `tests/security.test.js` and `tests/security-extended.test.js`. |
| Content includes spreadsheet formula-like strings | Automated | PASS | Verified in `tests/security.test.js` and `tests/security-extended.test.js`. |
| No sensitive data appears in console logs or error messages | Automated | PASS | Verified `validateRecord` and `validateImport` error messages omit field values (`tests/security-extended.test.js`). |
| Verify no network requests contain policy data | Automated | PASS | Static analysis confirms zero `fetch()` calls in `service-worker.js` and `content.js` (`tests/security-extended.test.js`). |
| Verify no broad host permissions are present without justification | Automated | PASS | `manifest.json` audit confirms no `tabs`, `history`, `webRequest`, or `<all_urls>` (`tests/security-extended.test.js`). |
| Verify no remote executable code is loaded | Automated | PASS | CSP (`script-src 'self'`, `object-src 'none'`) and static import audit verified in `tests/security-extended.test.js`. |
| Verify extraction is not triggered automatically on page navigation | Automated | PASS | Verified `content.js` ignores `DOMContentLoaded`/`navigate` and only runs on explicit `EXTRACT_FIELDS` (`tests/security-extended.test.js`). |
| Verify unrelated page actions are not automated | Automated | PASS | `content.js` only reads via `runExtraction`; no form submissions or DOM mutations exist in `src/content/` or `src/extraction/`. |

### §9. Usability and accessibility

| Scenario | Test Type | Status | Result / Notes |
|---|---|---|---|
| Popup is opened when no supported page is active | Automated | PASS | Verified in `tests/ui.test.jsx` (`shows clear error when popup is opened on unsupported/disconnected page`). |
| Popup dimensions and controls are usable | Manual | NOT IMPLEMENTED | Requires visual inspection in Chrome toolbar (`w-80` popup). |
| Keyboard-only navigation | Manual | NOT IMPLEMENTED | Requires manual Tab/Enter/Escape navigation check in Chrome popup and dashboard. |
| Screen-reader labels and focus management | Automated / Manual | PASS | Verified `<label htmlFor>` associations, `aria-required="true"`, and `role="dialog"` in `tests/ui.test.jsx`. Full screen-reader walkthrough is manual. |
| Clear status for extracting, review, saving, saved, and failure | Automated | PASS | Popup state transitions (Idle → Error, Idle → ReviewForm) and Dashboard status/empty states verified in `tests/ui.test.jsx`. |
| Confirmation for destructive actions | Automated | PASS | Verified delete confirmation dialog and cancel handling in `tests/ui.test.jsx`. |
| Empty dashboard state | Automated | PASS | Verified `"No records yet..."` empty state in `tests/ui.test.jsx`. |
| Search with no results | Automated | PASS | Verified `"No records match your search."` state in `tests/ui.test.jsx`. |
| Offline usage | Manual | NOT IMPLEMENTED | Requires manual Chrome DevTools Offline test (extension is fully local, no external requests). |
| Browser restart and extension restart preserve stored records | Manual | NOT IMPLEMENTED | Requires manual Chrome restart test with real IndexedDB persistence. |

---

## Manual Testing Instructions (Pending Scenarios)

To complete the remaining **NOT IMPLEMENTED** / manual scenarios:

1. **Load the extension in Chrome:**
   - Run `npm run build` to generate `dist/`.
   - Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `dist/`.
2. **Popup & Unsupported Page Checks (§1, §8, §9):**
   - Open a non-portal page (e.g., `https://example.com`), click the extension icon → **Extract fields**, and confirm an error message appears without crashing.
   - Check popup dimensions (`320px` width) and navigate all buttons/inputs using `Tab`, `Shift+Tab`, `Enter`, and `Escape`.
3. **Browser Persistence & IndexedDB (§3, §4, §9):**
   - Save a synthetic record via **ReviewForm**, close the popup mid-review on another attempt (confirm nothing was saved), then restart Chrome and reopen the Dashboard to verify saved records persist.
   - Test **Backup / Restore** in `Dashboard` → download backup, delete a record, restore with `Skip` and `Overwrite`, and verify counts.
4. **Print Preview & Offline (§7, §9):**
   - Select 2+ records in the Dashboard, click **Print**, and verify A4 layout, margins, page breaks, and absence of UI buttons.
   - Toggle **Offline** in Chrome DevTools Network tab and verify Dashboard search, edit, JSON/XLSX export, and Print still work.
5. **Portal-Specific & PDF Scenarios (§1, §5):**
   - Deferred until a representative authorized portal page structure (or sample PDF requirement) is provided.
