/**
 * record.js
 *
 * Record shape, schema version, and validation helpers.
 * All validation returns { valid: boolean, errors: string[] }.
 */

import { FIELD_DEFS, FIELD_MAP, REQUIRED_FIELD_IDS } from './fieldDefs.js';

export const SCHEMA_VERSION = 1;

/**
 * Create a fresh record shell from extracted / user-entered field values.
 * @param {Object} fields  - { fieldId: string }
 * @param {string} sourceOrigin - origin URL (no path) of the portal page
 * @returns {Object} record
 */
export function createRecord(fields, sourceOrigin = '') {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    sourceOrigin: sanitizeOrigin(sourceOrigin),
    fields: { ...fields },
  };
}

/**
 * Update an existing record's fields (returns new object, does not mutate).
 */
export function updateRecord(record, fieldUpdates) {
  return {
    ...record,
    updatedAt: new Date().toISOString(),
    fields: { ...record.fields, ...fieldUpdates },
  };
}

/**
 * Validate a record against the current schema.
 * Returns { valid, errors }.
 */
export function validateRecord(record) {
  const errors = [];

  if (!record || typeof record !== 'object') {
    return { valid: false, errors: ['Record must be an object.'] };
  }

  if (record.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`Unknown schema version: ${record.schemaVersion}.`);
  }

  if (!record.id || typeof record.id !== 'string' || record.id.trim() === '') {
    errors.push('Record is missing a valid id.');
  }

  if (!isValidISODate(record.createdAt)) {
    errors.push('Record has an invalid or missing createdAt timestamp.');
  }

  if (!isValidISODate(record.updatedAt)) {
    errors.push('Record has an invalid or missing updatedAt timestamp.');
  }

  if (!record.fields || typeof record.fields !== 'object') {
    errors.push('Record is missing a fields object.');
    return { valid: errors.length === 0, errors };
  }

  // Required fields
  for (const id of REQUIRED_FIELD_IDS) {
    const val = record.fields[id];
    if (!val || typeof val !== 'string' || val.trim() === '') {
      errors.push(`Required field "${FIELD_MAP[id].label}" is missing or empty.`);
    }
  }

  // Max length checks
  for (const def of FIELD_DEFS) {
    const val = record.fields[def.id];
    if (val !== undefined && val !== null && val !== '') {
      if (typeof val !== 'string') {
        errors.push(`Field "${def.label}" must be a string.`);
      } else if (val.length > def.maxLength) {
        errors.push(`Field "${def.label}" exceeds maximum length of ${def.maxLength}.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a list of records being imported from a backup.
 * Returns { valid, errors, records }.
 */
export function validateImport(parsed) {
  const errors = [];

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Backup file is not valid JSON.'] };
  }

  if (!Array.isArray(parsed.records)) {
    return { valid: false, errors: ['Backup does not contain a "records" array.'] };
  }

  if (typeof parsed.schemaVersion !== 'number') {
    errors.push('Backup is missing a schemaVersion field.');
  }

  if (parsed.schemaVersion > SCHEMA_VERSION) {
    errors.push(
      `Backup was created with a newer schema (v${parsed.schemaVersion}). ` +
        `This version supports up to v${SCHEMA_VERSION}. Update the extension first.`
    );
  }

  const seenIds = new Set();
  const recordErrors = [];
  for (let i = 0; i < parsed.records.length; i++) {
    const r = parsed.records[i];
    const { errors: rErr } = validateRecord(r);
    if (rErr.length > 0) {
      recordErrors.push(`Record ${i + 1}: ${rErr.join('; ')}`);
    }
    if (r.id && seenIds.has(r.id)) {
      recordErrors.push(`Record ${i + 1}: duplicate id "${r.id}" within backup.`);
    }
    if (r.id) seenIds.add(r.id);
  }

  errors.push(...recordErrors);

  return {
    valid: errors.length === 0,
    errors,
    records: parsed.records,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback (older environments / test)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function sanitizeOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

function isValidISODate(str) {
  if (typeof str !== 'string') return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}
