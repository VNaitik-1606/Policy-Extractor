/**
 * backup.js
 *
 * Export all records to a JSON backup file, and import/validate a backup.
 * Backup format: { schemaVersion, exportedAt, records: [...] }
 */

import db from './db.js';
import { SCHEMA_VERSION, validateImport } from '../schema/record.js';

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * Download a JSON backup of all records.
 */
export async function exportBackup() {
  const records = await db.records.orderBy('createdAt').toArray();
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    records,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  triggerDownload(blob, 'policy-extractor-backup.json');
  return { count: records.length };
}

// ─── Import ──────────────────────────────────────────────────────────────────

/**
 * Parse and validate a backup file (File object).
 * Returns { valid, errors, records, duplicates } without writing anything.
 * The caller must confirm before calling commitImport().
 */
export async function previewImport(file) {
  const text = await readFile(file);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { valid: false, errors: ['The file is not valid JSON.'], records: [], duplicates: [] };
  }

  const { valid, errors, records } = validateImport(parsed);
  if (!valid) {
    return { valid, errors, records: [], duplicates: [] };
  }

  // Find which imported records already exist by id
  const incomingIds = records.map((r) => r.id);
  const existing = await db.records.where('id').anyOf(incomingIds).toArray();
  const existingIds = new Set(existing.map((r) => r.id));
  const duplicates = records.filter((r) => existingIds.has(r.id));

  return { valid: true, errors: [], records, duplicates };
}

/**
 * Commit an import after the user has reviewed duplicates.
 * @param {Object[]} records  - validated record array from previewImport
 * @param {'skip'|'overwrite'} duplicateStrategy
 */
export async function commitImport(records, duplicateStrategy = 'skip') {
  const existingIds = new Set(
    (await db.records.where('id').anyOf(records.map((r) => r.id)).toArray()).map((r) => r.id)
  );

  const toAdd = [];
  const toUpdate = [];

  for (const r of records) {
    if (existingIds.has(r.id)) {
      if (duplicateStrategy === 'overwrite') {
        toUpdate.push(r);
      }
      // 'skip': do nothing
    } else {
      toAdd.push(r);
    }
  }

  await db.transaction('rw', db.records, async () => {
    if (toAdd.length > 0) await db.records.bulkAdd(toAdd);
    if (toUpdate.length > 0) await db.records.bulkPut(toUpdate);
  });

  return { added: toAdd.length, overwritten: toUpdate.length, skipped: records.length - toAdd.length - toUpdate.length };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
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
