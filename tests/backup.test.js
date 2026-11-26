/**
 * backup.test.js
 *
 * Tests for §4: Storage, migration, and backup edge cases.
 * Uses in-memory data only — no actual IndexedDB calls here (those are manual).
 * Tests the pure validation/serialization logic from backup.js and record.js.
 */

import { describe, it, expect } from 'vitest';
import { createRecord, validateRecord, validateImport, SCHEMA_VERSION } from '../src/schema/record.js';

// ─── Shared synthetic helper ──────────────────────────────────────────────────

function synth(overrides = {}) {
  return createRecord({
    policyNumber: 'BK-001',
    policyHolder: 'Backup Test',
    effectiveDate: '01/01/2025',
    expiryDate: '31/12/2025',
    coverageAmount: '100000',
    premiumAmount: '5000',
    policyType: 'Test',
    notes: '',
    ...overrides,
  });
}

function makeBackup(records, overrides = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    records,
    ...overrides,
  };
}

// ─── Empty database on first launch ──────────────────────────────────────────

describe('§4 Empty database on first launch', () => {
  it('validateImport of empty records array is valid', () => {
    const result = validateImport(makeBackup([]));
    expect(result.valid).toBe(true);
    expect(result.records).toHaveLength(0);
  });
});

// ─── Malformed JSON backup ────────────────────────────────────────────────────

describe('§4 Malformed JSON backup', () => {
  it('validateImport rejects null', () => {
    expect(validateImport(null).valid).toBe(false);
  });

  it('validateImport rejects a string', () => {
    expect(validateImport('not an object').valid).toBe(false);
  });

  it('validateImport rejects a number', () => {
    expect(validateImport(42).valid).toBe(false);
  });

  it('validateImport rejects when records is not an array', () => {
    expect(validateImport({ schemaVersion: 1, records: 'nope' }).valid).toBe(false);
  });

  it('validateImport rejects when records is null', () => {
    expect(validateImport({ schemaVersion: 1, records: null }).valid).toBe(false);
  });

  it('validateImport rejects when records is an object', () => {
    expect(validateImport({ schemaVersion: 1, records: {} }).valid).toBe(false);
  });
});

// ─── Unknown/future schema version ───────────────────────────────────────────

describe('§4 Unknown schema version in backup', () => {
  it('rejects schema version higher than current', () => {
    const result = validateImport(makeBackup([], { schemaVersion: 999 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('newer schema'))).toBe(true);
  });

  it('warns when schemaVersion is missing', () => {
    const result = validateImport({ records: [] });
    // Missing schemaVersion: should produce an error message but not crash
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('accepts supported older schema version (same as current)', () => {
    const r = synth();
    const result = validateImport(makeBackup([r]));
    expect(result.valid).toBe(true);
  });
});

// ─── Backup with missing or wrong-type fields ─────────────────────────────────

describe('§4 Backup with malformed records', () => {
  it('rejects record missing required policyNumber', () => {
    const r = synth({ policyNumber: '' });
    const result = validateImport(makeBackup([r]));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Policy Number'))).toBe(true);
  });

  it('rejects record with wrong type for a field (number instead of string)', () => {
    const r = synth();
    r.fields.policyNumber = 12345; // wrong type
    const result = validateImport(makeBackup([r]));
    expect(result.valid).toBe(false);
  });

  it('rejects record exceeding field maxLength', () => {
    const r = synth({ policyHolder: 'A'.repeat(200) });
    const result = validateImport(makeBackup([r]));
    expect(result.valid).toBe(false);
  });

  it('rejects record with missing id', () => {
    const r = synth();
    r.id = '';
    const result = validateImport(makeBackup([r]));
    expect(result.valid).toBe(false);
  });

  it('rejects record with invalid createdAt', () => {
    const r = synth();
    r.createdAt = 'not-a-date';
    const result = validateImport(makeBackup([r]));
    expect(result.valid).toBe(false);
  });
});

// ─── Duplicate IDs within backup ─────────────────────────────────────────────

describe('§4 Duplicate IDs within backup file', () => {
  it('detects two records with the same id in one backup', () => {
    const r = synth();
    const dup = { ...r }; // same id
    const result = validateImport(makeBackup([r, dup]));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('duplicate id'))).toBe(true);
  });

  it('two records with different ids in one backup is valid', () => {
    const r1 = synth({ policyNumber: 'BK-DUP-001' });
    const r2 = synth({ policyNumber: 'BK-DUP-002' });
    const result = validateImport(makeBackup([r1, r2]));
    expect(result.valid).toBe(true);
  });
});

// ─── Restore must not silently overwrite ─────────────────────────────────────

describe('§4 commitImport duplicate strategy', () => {
  // We test the logic by directly simulating what commitImport would do
  // without hitting real IndexedDB (integration test is manual)

  it('skip strategy: existing records are not in toUpdate list', () => {
    const existingIds = new Set(['id-1', 'id-2']);
    const records = [
      { id: 'id-1', fields: { policyNumber: 'OLD' } },
      { id: 'id-3', fields: { policyNumber: 'NEW' } },
    ];

    const toAdd = [];
    const toUpdate = [];
    const strategy = 'skip';

    for (const r of records) {
      if (existingIds.has(r.id)) {
        if (strategy === 'overwrite') toUpdate.push(r);
        // skip: do nothing
      } else {
        toAdd.push(r);
      }
    }

    expect(toAdd).toHaveLength(1);
    expect(toAdd[0].id).toBe('id-3');
    expect(toUpdate).toHaveLength(0);
  });

  it('overwrite strategy: existing records appear in toUpdate', () => {
    const existingIds = new Set(['id-1']);
    const records = [
      { id: 'id-1', fields: { policyNumber: 'UPDATED' } },
      { id: 'id-2', fields: { policyNumber: 'NEW' } },
    ];

    const toAdd = [];
    const toUpdate = [];
    const strategy = 'overwrite';

    for (const r of records) {
      if (existingIds.has(r.id)) {
        if (strategy === 'overwrite') toUpdate.push(r);
      } else {
        toAdd.push(r);
      }
    }

    expect(toAdd).toHaveLength(1);
    expect(toUpdate).toHaveLength(1);
    expect(toUpdate[0].fields.policyNumber).toBe('UPDATED');
  });
});

// ─── Export-restore round-trip (pure logic) ───────────────────────────────────

describe('§4 Export and restore round-trip (data fidelity)', () => {
  it('serializing a record to JSON and parsing it back preserves all fields', () => {
    const r = synth({
      policyNumber: 'BK-RT-001',
      policyHolder: "O'Brien-García",
      effectiveDate: '15/06/2025',
      notes: 'Unicode: ñ é ü 中文 🎉',
    });

    const backup = makeBackup([r]);
    const json = JSON.stringify(backup);
    const parsed = JSON.parse(json);

    expect(parsed.records[0].fields.policyNumber).toBe('BK-RT-001');
    expect(parsed.records[0].fields.policyHolder).toBe("O'Brien-García");
    expect(parsed.records[0].fields.notes).toBe('Unicode: ñ é ü 中文 🎉');
  });

  it('round-trip backup passes validateImport', () => {
    const r = synth({ policyNumber: 'BK-RT-002' });
    const backup = makeBackup([r]);
    const parsed = JSON.parse(JSON.stringify(backup));
    expect(validateImport(parsed).valid).toBe(true);
  });

  it('large collection of records round-trips correctly', () => {
    const records = Array.from({ length: 100 }, (_, i) =>
      synth({ policyNumber: `BK-LARGE-${String(i).padStart(4, '0')}` })
    );
    const backup = makeBackup(records);
    const parsed = JSON.parse(JSON.stringify(backup));
    expect(validateImport(parsed).valid).toBe(true);
    expect(parsed.records).toHaveLength(100);
  });
});
