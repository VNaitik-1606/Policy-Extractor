/**
 * jsonExport.js
 *
 * Export records to a JSON file.
 * Only the configured field definitions are included.
 * No raw page content or unrelated data.
 */

import { SCHEMA_VERSION } from '../schema/record.js';
import { FIELD_DEFS } from '../schema/fieldDefs.js';

/**
 * @param {Object[]} records - array of stored record objects
 * @param {string[]} [fieldIds] - optional subset of field IDs to include; defaults to all
 */
export function exportJSON(records, fieldIds) {
  const allowedIds = new Set(fieldIds ?? FIELD_DEFS.map((f) => f.id));

  const exported = records.map((r) => {
    const fields = {};
    for (const id of allowedIds) {
      if (Object.prototype.hasOwnProperty.call(r.fields ?? {}, id)) {
        fields[id] = r.fields[id];
      }
    }
    return {
      id: r.id,
      schemaVersion: r.schemaVersion,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      fields,
    };
  });

  const payload = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    count: exported.length,
    records: exported,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, 'policy-records.json');
  return exported.length;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
