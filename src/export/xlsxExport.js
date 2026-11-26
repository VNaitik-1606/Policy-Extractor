/**
 * xlsxExport.js
 *
 * Export records to an XLSX file using SheetJS.
 * Mitigates spreadsheet formula injection by prefixing formula-like strings.
 */

import * as XLSX from 'xlsx';
import { FIELD_DEFS } from '../schema/fieldDefs.js';
import { sanitizeSpreadsheetCell } from '../utils/normalize.js';

/**
 * @param {Object[]} records  - array of stored record objects
 * @param {string[]} [fieldIds] - optional subset of field IDs; defaults to all
 */
export function exportXLSX(records, fieldIds) {
  const defs = fieldIds
    ? FIELD_DEFS.filter((f) => fieldIds.includes(f.id))
    : FIELD_DEFS;

  // Build header row
  const headers = ['Saved At', ...defs.map((f) => f.label)];

  // Build data rows
  const rows = records.map((r) => {
    const row = [r.createdAt ?? ''];
    for (const def of defs) {
      const raw = r.fields?.[def.id] ?? '';
      row.push(sanitizeSpreadsheetCell(raw));
    }
    return row;
  });

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto column widths (rough estimate)
  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.max(
      h.length,
      ...rows.map((r) => String(r[i] ?? '').length)
    ) + 2,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Policies');

  XLSX.writeFile(wb, 'policy-records.xlsx');
  return records.length;
}
