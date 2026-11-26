/**
 * schema.test.js
 *
 * Tests for record creation, validation, and import validation.
 * All data is synthetic — no real policy information.
 */

import { describe, it, expect } from 'vitest';
import {
  createRecord,
  updateRecord,
  validateRecord,
  validateImport,
  SCHEMA_VERSION,
} from '../src/schema/record.js';

// ─── Synthetic helpers ────────────────────────────────────────────────────────

function syntheticFields(overrides = {}) {
  return {
    policyNumber: 'TEST-001',
    policyHolder: 'Test Person',
    effectiveDate: '01/01/2025',
    expiryDate: '31/12/2025',
    coverageAmount: '100000',
    premiumAmount: '5000',
    policyType: 'Test Type',
    notes: '',
    ...overrides,
  };
}

// ─── createRecord ─────────────────────────────────────────────────────────────

describe('createRecord', () => {
  it('creates a record with a uuid id', () => {
    const r = createRecord(syntheticFields());
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sets schemaVersion to current version', () => {
    const r = createRecord(syntheticFields());
    expect(r.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('stores sourceOrigin (not full URL)', () => {
    const r = createRecord(syntheticFields(), 'https://portal.example.com/policy/123');
    expect(r.sourceOrigin).toBe('https://portal.example.com');
  });

  it('sets createdAt and updatedAt to valid ISO dates', () => {
    const r = createRecord(syntheticFields());
    expect(() => new Date(r.createdAt)).not.toThrow();
    expect(new Date(r.createdAt).toISOString()).toBe(r.createdAt);
  });

  it('copies all fields from input', () => {
    const fields = syntheticFields({ notes: 'some note' });
    const r = createRecord(fields);
    expect(r.fields.notes).toBe('some note');
  });
});

// ─── updateRecord ─────────────────────────────────────────────────────────────

describe('updateRecord', () => {
  it('merges field updates into the new record', () => {
    const r = createRecord(syntheticFields());
    const updated = updateRecord(r, { notes: 'edited' });
    expect(updated.fields.notes).toBe('edited');
    // updatedAt must be a valid ISO date string
    expect(isNaN(new Date(updated.updatedAt).getTime())).toBe(false);
    // other fields must be preserved
    expect(updated.fields.policyNumber).toBe(r.fields.policyNumber);
  });

  it('does not mutate the original record', () => {
    const r = createRecord(syntheticFields());
    const original = { ...r };
    updateRecord(r, { notes: 'x' });
    expect(r.fields.notes).toBe(original.fields.notes);
  });
});

// ─── validateRecord ───────────────────────────────────────────────────────────

describe('validateRecord', () => {
  it('passes for a valid record', () => {
    const r = createRecord(syntheticFields());
    const { valid } = validateRecord(r);
    expect(valid).toBe(true);
  });

  it('fails if policyNumber is missing', () => {
    const r = createRecord(syntheticFields({ policyNumber: '' }));
    const { valid, errors } = validateRecord(r);
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('Policy Number'))).toBe(true);
  });

  it('fails if policyHolder is missing', () => {
    const r = createRecord(syntheticFields({ policyHolder: '   ' }));
    const { valid } = validateRecord(r);
    expect(valid).toBe(false);
  });

  it('fails if schemaVersion is wrong', () => {
    const r = { ...createRecord(syntheticFields()), schemaVersion: 99 };
    const { valid } = validateRecord(r);
    expect(valid).toBe(false);
  });

  it('fails if id is missing', () => {
    const r = { ...createRecord(syntheticFields()), id: '' };
    const { valid } = validateRecord(r);
    expect(valid).toBe(false);
  });

  it('fails if a field exceeds maxLength', () => {
    const r = createRecord(syntheticFields({ policyHolder: 'A'.repeat(200) }));
    const { valid } = validateRecord(r);
    expect(valid).toBe(false);
  });

  it('passes with optional fields missing', () => {
    const r = createRecord(syntheticFields({ expiryDate: '', coverageAmount: '', premiumAmount: '' }));
    const { valid } = validateRecord(r);
    expect(valid).toBe(true);
  });
});

// ─── validateImport ───────────────────────────────────────────────────────────

describe('validateImport', () => {
  it('rejects null input', () => {
    expect(validateImport(null).valid).toBe(false);
  });

  it('rejects missing records array', () => {
    expect(validateImport({ schemaVersion: 1 }).valid).toBe(false);
  });

  it('rejects a future schema version', () => {
    const result = validateImport({ schemaVersion: 999, records: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('newer schema'))).toBe(true);
  });

  it('detects duplicate ids within backup', () => {
    const r = createRecord(syntheticFields());
    const result = validateImport({ schemaVersion: 1, records: [r, { ...r }] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('duplicate id'))).toBe(true);
  });

  it('passes for a valid backup', () => {
    const r = createRecord(syntheticFields());
    const result = validateImport({ schemaVersion: 1, records: [r] });
    expect(result.valid).toBe(true);
  });
});
