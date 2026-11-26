/**
 * printTemplate.js
 *
 * Generates an HTML string for a print-ready layout.
 * Uses escapeHtml() throughout — no unescaped portal text ever touches innerHTML.
 * The print layout is controlled via @media print in global.css.
 */

import { FIELD_DEFS } from '../schema/fieldDefs.js';
import { escapeHtml } from '../utils/sanitize.js';

/**
 * Open a print window for the given records.
 *
 * @param {Object[]} records
 * @param {string[]} [fieldIds] - optional subset
 */
export function printRecords(records, fieldIds) {
  const defs = fieldIds
    ? FIELD_DEFS.filter((f) => fieldIds.includes(f.id))
    : FIELD_DEFS;

  const html = buildPrintHTML(records, defs);
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Could not open print window. Please allow pop-ups for this extension.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

export function buildPrintHTML(records, defs = FIELD_DEFS) {
  const rows = records.map((r) => buildRecordHTML(r, defs)).join('<div class="page-break"></div>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Policy Records</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; }
    h1 { font-size: 14pt; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #bbb; padding: 6px 10px; text-align: left; }
    th { background: #f0f4ff; font-weight: bold; width: 35%; }
    .record-header { font-size: 12pt; font-weight: bold; margin: 16px 0 8px; }
    .meta { font-size: 9pt; color: #555; margin-bottom: 6px; }
    .page-break { page-break-after: always; }
    @media print {
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body>
  <h1>Policy Records</h1>
  <p class="meta">Printed: ${escapeHtml(new Date().toLocaleString())}</p>
  ${rows}
</body>
</html>`;
}

export function buildRecordHTML(record, defs = FIELD_DEFS) {
  const fieldRows = defs
    .map((def) => {
      const val = record.fields?.[def.id] ?? '';
      return `<tr>
      <th scope="row">${escapeHtml(def.label)}</th>
      <td>${escapeHtml(val) || '<em style="color:#999">—</em>'}</td>
    </tr>`;
    })
    .join('\n');

  return `<div class="record">
  <div class="record-header">Policy Record</div>
  <div class="meta">Saved: ${escapeHtml(record.createdAt ?? '')}</div>
  <table>
    <tbody>${fieldRows}</tbody>
  </table>
</div>`;
}
