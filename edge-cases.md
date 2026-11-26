# Edge Cases and Test Scenarios — Policy Extractor

Use synthetic policy data only. These tests are intended to validate the application's behavior, reliability, privacy, and usability. Do not use real customer records in test fixtures.

## 1. Extraction and page structure
- Page contains all configured fields in the expected structure.
- One or more configured fields are missing.
- Fields are present but empty or whitespace-only.
- Labels have minor wording, capitalization, punctuation, or spacing changes.
- Values appear more than once; verify the intended occurrence is selected.
- A field's value is split across DOM nodes.
- Text contains extra whitespace, line breaks, tabs, or non-breaking spaces.
- Page is still loading when extraction is invoked.
- Page content changes after extraction begins.
- The user invokes extraction on an unsupported page.
- The extension is invoked on a domain outside the approved host list.
- The page contains unrelated or hidden content; verify it is not collected.
- Extraction is invoked repeatedly; verify no accidental duplicate is saved.
- Portal page content includes text resembling instructions, scripts, markup, or malicious input; verify it is treated as data only.

## 2. Data validation and normalization
- Names with accents, non-Latin characters, initials, apostrophes, and hyphens.
- Long names or addresses.
- Leading zeros in policy numbers or other identifiers.
- IDs containing letters, spaces, hyphens, or punctuation.
- Date formats such as DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, ambiguous dates, and invalid dates.
- Currency values with commas, decimals, currency symbols, or whitespace.
- Negative, zero, very large, or malformed numeric values.
- Values that exceed configured length limits.
- Unicode whitespace and unusual but valid characters.
- Invalid values should be flagged, not silently rewritten into a plausible value.
- Missing required values prevent confirmation or are clearly flagged according to requirements.

## 3. Review and save workflow
- User edits a field before saving.
- User discards the extracted result.
- User closes the popup during review.
- User cancels a save.
- Save is clicked twice rapidly.
- Storage fails or quota is exceeded.
- Save succeeds but the UI is interrupted before showing confirmation.
- Record is saved with optional fields missing.
- Duplicate policy number: warn and offer a deliberate resolution rather than silently overwrite.
- User edits a previously saved record.
- User deletes a record; require confirmation and handle cancellation.
- Search/filter state remains understandable after editing or deletion.

## 4. Storage, migration and backup
- Empty database on first launch.
- Large collection of records.
- Database unavailable, corrupted, or quota-limited.
- Extension upgrade with an older database schema.
- Backup from a supported older schema version.
- Backup with an unknown schema version.
- Malformed JSON backup.
- Backup with missing fields, wrong types, excessive field lengths, or invalid dates.
- Backup contains duplicate IDs.
- Import contains records matching existing records.
- Import is cancelled partway through or fails.
- Restore must not silently overwrite existing data.
- Export and restore round-trip preserves supported data.
- Storage migration failure leaves existing data recoverable.

## 5. PDF and document extraction
- PDF contains selectable text.
- PDF is image-only/scanned.
- PDF has multiple pages.
- PDF is rotated or has unusual page dimensions.
- PDF is malformed or password-protected.
- PDF has no relevant fields.
- PDF text order differs from visual order.
- PDF contains text with unusual Unicode characters.
- PDF is unusually large; verify graceful performance and limits.
- Extraction fails; do not falsely report success or save misleading data.

## 6. Excel/CSV export
- Export empty selection.
- Export a single record.
- Export a large selection.
- Fields contain commas, quotes, line breaks, or Unicode.
- Identifier values contain leading zeros.
- Cells contain formula-like prefixes (`=`, `+`, `-`, `@`); verify formula injection mitigation.
- User selects only some fields for export.
- Export filename avoids sensitive values by default.
- Export failure or cancellation is handled clearly.
- Exported columns, headers, dates, and numeric formats are consistent.

## 7. Print/PDF output
- Single-record output.
- Multiple records and page breaks.
- Long names, addresses, and text values.
- Empty optional fields.
- Missing required fields.
- Very large values and wrapping.
- Print preview at A4 and alternative paper sizes if supported.
- Margins, page breaks, headers and footers.
- Print output excludes UI controls and unwanted metadata.
- Print HTML safely escapes special characters and hostile markup.
- PDF generation failure is handled without claiming success.

## 8. Permissions and security
- Permission is denied or revoked.
- Extension is installed but has not been granted host access.
- Attempt to run on a non-approved domain.
- Extension receives malformed messages.
- Page content includes HTML-like strings or script-like payloads.
- Content includes spreadsheet formula-like strings.
- No sensitive data appears in console logs or error messages.
- Verify no network requests contain policy data.
- Verify no broad host permissions are present without justification.
- Verify no remote executable code is loaded.
- Verify extraction is not triggered automatically on page navigation.
- Verify unrelated page actions are not automated.

## 9. Usability and accessibility
- Popup is opened when no supported page is active.
- Popup dimensions and controls are usable.
- Keyboard-only navigation.
- Screen-reader labels and focus management.
- Clear status for extracting, review, saving, saved, and failure.
- Confirmation for destructive actions.
- Empty dashboard state.
- Search with no results.
- Offline usage.
- Browser restart and extension restart preserve stored records.

## Test reporting
For each test, record:
- Scenario
- Expected behavior
- Actual behavior
- Pass/Fail
- Notes or follow-up

Use synthetic values and avoid screenshots containing real policy information.
