# Agent Instructions — Policy Extractor

## Project purpose
Build a local-first Chrome extension for a single authorized user. It helps extract selected fields from policy information on an authorized company portal, review/correct them, save them locally, and export records to JSON, Excel, and a standardized printable format.

## Read first
Before doing any work, read:
- `agent.md`
- `security.md`

## Development principles
- Inspect the existing repository before making changes.
- Work in small, verifiable milestones.
- Prefer simple maintainable code over unnecessary abstraction.
- Do not assume portal selectors, document structure, or required fields. Use configurable adapters/placeholders until authorized examples are provided.
- Keep extraction user-triggered, transparent, and limited to explicitly selected fields.
- Require review and confirmation before saving extracted data.
- Do not silently discard, overwrite, or duplicate records.
- Do not introduce cloud services or external APIs for policy data without explicit approval.
- Keep the UI accessible and suitable for a nontechnical user.
- Report tests, build results, limitations, and files changed.

## Target stack
- Chrome Extension Manifest V3
- React
- Vite
- Tailwind CSS
- IndexedDB via Dexie.js
- PDF.js only if authorized text extraction from PDFs is required
- SheetJS for XLSX export
- HTML/CSS print layouts; add a PDF library only if justified

## Core workflow
1. User opens a policy page they are authorized to access.
2. User manually invokes extraction.
3. Extension extracts only configured fields from accessible content.
4. User reviews and edits values.
5. User confirms saving.
6. Dashboard manages saved records.
7. User exports JSON/XLSX or produces a print-ready output.

## Milestones
1. Repository audit and architecture proposal.
2. Extension skeleton and permission-minimal manifest.
3. Schema and local persistence.
4. Extraction adapter and review form.
5. Records dashboard.
6. JSON/XLSX exports.
7. Print/PDF template.
8. Backup/restore.
9. Tests, documentation, and installation instructions.

## Definition of done
- Extraction is user-triggered.
- Only configured fields are collected.
- User review is required before persistence.
- Data is stored locally.
- JSON and XLSX exports work.
- Print layout is configurable and tested.
- Backup/restore is validated.
- No secrets or real policy data appear in test fixtures, logs, or documentation.
- Build and tests pass, or failures are clearly documented.
