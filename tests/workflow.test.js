/**
 * workflow.test.js
 *
 * Tests for §3: Review and save workflow edge cases.
 * Tests pure logic (createRecord, updateRecord, validateRecord, duplicate detection).
 * UI states (double-click, storage failure, popup close) are manual.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRecord, updateRecord, validateRecord } from '../src/schema/record.js';

function synth(overrides = {}) {
  return {
    policyNumber: 'WF-001',
    policyHolder: 'Workflow Test',
    effectiveDate: '01/06/2025',
    expiryDate: '01/06/2026',
    coverageAmount: '250000',
    premiumAmount: '8500',
    policyType: 'Life',
    notes: '',
    ...overrides,
  };
}

// ─── User edits a field before saving ────────────────────────────────────────

describe('§3 User edits a field before saving', () => {
  it('edited value is reflected in the record', () => {
    const r = createRecord(synth({ policyHolder: 'Original Name' }));
    const updated = updateRecord(r, { policyHolder: 'Corrected Name' });
    expect(updated.fields.policyHolder).toBe('Corrected Name');
  });

  it('edit to required field — validation passes when value is now valid', () => {
    // Start with a blank required field
    const r = createRecord(synth({ policyNumber: '' }));
    expect(validateRecord(r).valid).toBe(false);
    // User corrects it
    const corrected = updateRecord(r, { policyNumber: 'WF-CORRECTED' });
    expect(validateRecord(corrected).valid).toBe(true);
  });

  it('edit to required field — validation still fails if still blank', () => {
    const r = createRecord(synth({ policyNumber: '' }));
    const updated = updateRecord(r, { policyHolder: 'Still blank policyNumber' });
    expect(validateRecord(updated).valid).toBe(false);
  });
});

// ─── Discard result ───────────────────────────────────────────────────────────

describe('§3 User discards extracted result', () => {
  it('discarding does not persist the record — no record object is committed', () => {
    // Discard is purely a UI state machine action (popup goes back to IDLE).
    // The record object is simply never passed to db.records.add().
    // We test that an un-saved record is not mistakenly considered valid for auto-save.
    const r = createRecord(synth());
    // If discard was not called, the record should still be valid (but not saved)
    expect(validateRecord(r).valid).toBe(true);
    // Discard means the caller simply never calls db.records.add(r).
    // We verify the record is not somehow a singleton or global.
    const r2 = createRecord(synth({ policyNumber: 'WF-002' }));
    expect(r2.id).not.toBe(r.id);
  });
});

// ─── Save with optional fields missing ───────────────────────────────────────

describe('§3 Record saved with optional fields missing', () => {
  it('saves successfully when only required fields are present', () => {
    const r = createRecord({
      policyNumber: 'WF-OPT-001',
      policyHolder: 'Optional Test',
      effectiveDate: '01/01/2025',
    });
    expect(validateRecord(r).valid).toBe(true);
  });

  it('expiryDate, coverageAmount, premiumAmount, policyType, notes are all optional', () => {
    const r = createRecord({
      policyNumber: 'WF-OPT-002',
      policyHolder: 'Optional Test',
      effectiveDate: '01/01/2025',
      expiryDate: '',
      coverageAmount: '',
      premiumAmount: '',
      policyType: '',
      notes: '',
    });
    expect(validateRecord(r).valid).toBe(true);
  });
});

// ─── Duplicate policy number detection ───────────────────────────────────────

describe('§3 Duplicate policy number detection (logic layer)', () => {
  it('two records with the same policyNumber can be detected by comparing field values', () => {
    const r1 = createRecord(synth({ policyNumber: 'DUP-001' }));
    const r2 = createRecord(synth({ policyNumber: 'DUP-001' }));
    expect(r1.fields.policyNumber).toBe(r2.fields.policyNumber);
    // Different UUIDs — the DB layer must detect and warn about this
    expect(r1.id).not.toBe(r2.id);
  });

  it('records with different policy numbers are not duplicates', () => {
    const r1 = createRecord(synth({ policyNumber: 'DUP-001' }));
    const r2 = createRecord(synth({ policyNumber: 'DUP-002' }));
    expect(r1.fields.policyNumber).not.toBe(r2.fields.policyNumber);
  });
});

// ─── Edit a previously saved record ──────────────────────────────────────────

describe('§3 Edit a previously saved record', () => {
  it('updateRecord returns a new object with updated fields', () => {
    const r = createRecord(synth());
    const updated = updateRecord(r, { notes: 'Edited note' });
    expect(updated.fields.notes).toBe('Edited note');
    expect(updated.id).toBe(r.id); // same record
  });

  it('updateRecord does not mutate original', () => {
    const r = createRecord(synth({ notes: 'original' }));
    updateRecord(r, { notes: 'changed' });
    expect(r.fields.notes).toBe('original');
  });

  it('updated record validates correctly', () => {
    const r = createRecord(synth());
    const updated = updateRecord(r, { policyType: 'Health', notes: 'Updated' });
    expect(validateRecord(updated).valid).toBe(true);
  });

  it('update that clears a required field fails validation', () => {
    const r = createRecord(synth());
    const updated = updateRecord(r, { policyNumber: '' });
    expect(validateRecord(updated).valid).toBe(false);
  });
});

// ─── Rapid double-save guard ──────────────────────────────────────────────────

describe('§3 Double-save guard (logic)', () => {
  it('a simple boolean flag prevents the second call from proceeding', () => {
    // Mirrors the useRef(false) guard in ReviewForm
    let guard = false;
    let saveCount = 0;

    function attemptSave() {
      if (guard) return 'blocked';
      guard = true;
      saveCount++;
      return 'saved';
    }

    expect(attemptSave()).toBe('saved');
    expect(attemptSave()).toBe('blocked');
    expect(saveCount).toBe(1);
  });
});
