# Policy Extractor

A local-first Chrome extension for extracting, reviewing, and managing policy-related data from web portals.

## About

Policy Extractor started as a side project around a fairly niche problem I wanted to solve. What began as a small idea gradually grew into an application with extraction, validation, record management, backups, and export functionality.

I built the project with the help of agentic AI throughout the development process, using it as part of the iterative workflow for planning, implementation, testing, debugging, and refinement.

The original use case is niche, but I think the underlying implementation could be adapted to a much wider range of portals and structured-data workflows and there's plenty of room to expand and improve it.

---

## Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Exports](#exports)
- [Backup and Restore](#backup-and-restore)
- [Development](#development)
- [Tests](#tests)
- [Limitations](#limitations)
- [Security notes](#security-notes)

---

## Features

- **Manual extraction** — you trigger it; nothing is collected automatically.
- **Review before saving** — extracted fields appear in an editable form; required fields are highlighted.
- **Local storage** — records are stored in your browser's IndexedDB. Nothing is sent to any server.
- **Dashboard** — search, filter, sort, edit, and delete records.
- **Exports** — JSON, Excel (XLSX), and a print-ready HTML layout.
- **Backup and restore** — download a full JSON backup; import it back with duplicate handling.

---

## Installation

### Prerequisites

- Node.js 18 or later
- npm 9 or later
- Google Chrome (or a Chromium-based browser)

### Build

```bash
cd "Policy Extractor"
npm install
npm run build
```

The built extension is output to the `dist/` folder.

### Load in Chrome

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `dist/` folder inside this project.

The extension icon will appear in the Chrome toolbar.

---

## Usage

### Core workflow

1. Log in to your company portal as you normally would.
2. Open a policy page you are authorized to access.
3. Click the **Policy Extractor** icon in the toolbar.
4. Click **Extract fields**.
5. Review the extracted values in the form. Edit anything that is wrong.
6. Click **Save record**.
7. Open the **Dashboard** (link in the popup, or the icon) to manage your saved records.

### Dashboard

- **Search** by policy number, holder name, or type.
- **Sort** by date saved, policy number, or holder name.
- **Select** records with checkboxes for bulk export or delete.
- **Edit** any saved record by clicking its Edit button.
- **Delete** requires confirmation. Deleted records cannot be recovered (use backups).

---

## Configuration

### Portal domain

Before using real extraction, you must configure the portal domain in two places:

1. **`manifest.json`** — replace both `PLACEHOLDER_PORTAL_DOMAIN_REQUIRED` values with your portal's URL pattern, e.g. `https://portal.example.com/*`.
2. **`src/extraction/adapter.js`** — register a real adapter for the domain once you can supply the page structure.

> **Important:** Do not guess or invent selectors. Provide a representative page structure (with real data removed) so the adapter can be built accurately.

### Fields

Fields are defined in `src/schema/fieldDefs.js`. Add, remove, or rename fields there. Update the extraction adapter to match.

---

## Exports

| Format | Action | Notes |
|--------|--------|-------|
| JSON | Dashboard → Export JSON | Machine-readable; can be re-imported |
| Excel | Dashboard → Export Excel | Opens as an XLSX file |
| Print | Dashboard → Print | Opens a print-ready page |

Export filenames are generic (`policy-records.json`, `policy-records.xlsx`) and do not embed policy numbers or customer names.

---

## Backup and Restore

1. Open the **Dashboard**.
2. Click **Backup / Restore**.
3. Click **Download backup** to save a JSON file of all records.
4. To restore, click **Select backup file**, choose the file, review the preview, and confirm.

> Backups contain your policy data. Store them securely and restrict access to the backup files.

> Local browser storage is **not** encrypted at rest by Chrome. If you need stronger protection, consider encrypting the backup file with a tool like 7-Zip or VeraCrypt.

---

## Development

```bash
npm install          # install dependencies
npm run dev          # watch mode (rebuilds on save)
npm run build        # production build → dist/
npm test             # run tests
npm run lint         # lint source
```

After each `dev` or `build`, reload the extension in `chrome://extensions` by clicking the refresh icon on the extension card.

---

## Tests

Run with:

```bash
npm test
```

Tests cover:
- Record schema creation and validation (`tests/schema.test.js`)
- Normalization utilities — dates, currency, whitespace (`tests/normalize.test.js`)
- Extraction adapter dispatch (`tests/adapter.test.js`)
- Security behaviors — formula injection, HTML escaping, untrusted input (`tests/security.test.js`)

All test data is **synthetic**. No real policy information appears in any test file.

---

## Limitations

| Limitation | Detail |
|-----------|--------|
| Portal-specific extraction | The extraction adapter uses placeholder stubs until a representative page structure is supplied. |
| PDF extraction | Not yet implemented. PDF.js integration is planned if authorized text extraction from PDFs is required. |
| Encryption at rest | IndexedDB is not encrypted by Chrome. This is documented, not implied to be secure. |
| Single browser | Records are stored in the browser profile where the extension is installed. They are not shared across browsers or devices. |
| No cloud sync | By design. All data stays local. |
| Chrome only | Built for Chrome MV3. May work in other Chromium browsers but is not tested there. |

---

## Security notes

- Extraction is **always manually triggered** — it does not run automatically on page load or navigation.
- Only the fields defined in `fieldDefs.js` are extracted. Full page content is never captured.
- Portal content is treated as **untrusted data** throughout. Text is rendered via `textContent`, never `innerHTML`.
- Export cells are protected against **spreadsheet formula injection** (strings starting with `=`, `+`, `-`, `@` are prefixed with `'`).
- The extension requests **minimal permissions**: `activeTab`, `scripting`, and `storage`. No broad host permissions, `webRequest`, or `tabs`.
- No external network requests are made by the extension.
- No credentials, session tokens, or cookies are stored.
