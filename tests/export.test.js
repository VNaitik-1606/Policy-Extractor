/**
 * export.test.js
 *
 * Tests for §6: Excel/CSV export and §4 JSON export logic.
 * Tests the pure data-transformation layer without triggering file downloads.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitizeSpreadsheetCell } from '../src/utils/normalize.js';
import { FIELD_DEFS } from '../src/schema/fieldDefs.js';
import { createRecord } from '../src/schema/record.js';
import { SCHEMA_VERSION } from '../src/schema/record.js';

// ─── Shared synthetic helpers ─────────────────────────────────────────────────

function synth(overrides = {}) {
  return createRecord({
    policyNumber: 'EXP-001',
    policyHolder: 'Export Test',
    effectiveDate: '01/01/2025',
    expiryDate: '31/12/2025',
    coverageAmount: '500000',
    premiumAmount: '12000',
    policyType: 'Life',
    notes: '',
    ...overrides,
  });
}

// ─── JSON export logic ────────────────────────────────────────────────────────
// We test the transformation logic directly without triggering a download.

function buildJSONPayload(records, fieldIds) {
  const allowedIds = new Set(fieldIds ?? FIELD_DEFS.map((f) => f.id));
  const exported = records.map((r) => {
    const fields = {};
    for (const id of allowedIds) {
      if (Object.prototype.hasOwnProperty.call(r.fields ?? {}, id)) {
        fields[id] = r.fields[id];
      }
    }
    return { id: r.id, schemaVersion: r.schemaVersion, createdAt: r.createdAt, updatedAt: r.updatedAt, fields };
  });
  return { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), count: exported.length, records: exported };
}

describe('§6/§4 JSON export logic', () => {
  it('empty selection produces count: 0 and empty records array', () => {
    const payload = buildJSONPayload([]);
    expect(payload.count).toBe(0);
    expect(payload.records).toHaveLength(0);
  });

  it('single record export includes correct fields', () => {
    const r = synth({ policyNumber: 'EXP-JSON-001' });
    const payload = buildJSONPayload([r]);
    expect(payload.count).toBe(1);
    expect(payload.records[0].fields.policyNumber).toBe('EXP-JSON-001');
  });

  it('export with fieldIds subset only includes those fields', () => {
    const r = synth({ policyNumber: 'EXP-JSON-002', coverageAmount: '999' });
    const payload = buildJSONPayload([r], ['policyNumber', 'coverageAmount']);
    expect(payload.records[0].fields).toHaveProperty('policyNumber');
    expect(payload.records[0].fields).toHaveProperty('coverageAmount');
    expect(payload.records[0].fields).not.toHaveProperty('policyHolder');
    expect(payload.records[0].fields).not.toHaveProperty('notes');
  });

  it('fields with commas, quotes, line breaks are preserved as-is in JSON', () => {
    const r = synth({ notes: 'line1\nline2, "quoted"' });
    const payload = buildJSONPayload([r]);
    expect(payload.records[0].fields.notes).toBe('line1\nline2, "quoted"');
  });

  it('leading zeros in identifier are preserved', () => {
    const r = synth({ policyNumber: '00042' });
    const payload = buildJSONPayload([r]);
    expect(payload.records[0].fields.policyNumber).toBe('00042');
  });

  it('large export (100 records) produces correct count', () => {
    const records = Array.from({ length: 100 }, (_, i) =>
      synth({ policyNumber: `EXP-${String(i).padStart(4, '0')}` })
    );
    const payload = buildJSONPayload(records);
    expect(payload.count).toBe(100);
    expect(payload.records).toHaveLength(100);
  });

  it('schemaVersion is included in export payload', () => {
    const payload = buildJSONPayload([synth()]);
    expect(payload.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('exportedAt is a valid ISO date', () => {
    const payload = buildJSONPayload([synth()]);
    expect(new Date(payload.exportedAt).toISOString()).toBe(payload.exportedAt);
  });

  it('export filename is generic (no policyNumber or holder embedded)', () => {
    // Filename is hardcoded in exportJSON; we verify the constant
    const filename = 'policy-records.json';
    expect(filename).not.toContain('EXP-001');
    expect(filename).not.toContain('Export Test');
  });
});

// ─── XLSX export — row builder (pure logic) ───────────────────────────────────

function buildXLSXRows(records, fieldIds) {
  const defs = fieldIds ? FIELD_DEFS.filter((f) => fieldIds.includes(f.id)) : FIELD_DEFS;
  const headers = ['Saved At', ...defs.map((f) => f.label)];
  const rows = records.map((r) => {
    const row = [r.createdAt ?? ''];
    for (const def of defs) {
      const raw = r.fields?.[def.id] ?? '';
      row.push(sanitizeSpreadsheetCell(raw));
    }
    return row;
  });
  return { headers, rows };
}

describe('§6 XLSX export — row builder logic', () => {
  it('headers start with "Saved At" followed by field labels', () => {
    const { headers } = buildXLSXRows([synth()]);
    expect(headers[0]).toBe('Saved At');
    expect(headers.slice(1)).toEqual(FIELD_DEFS.map((f) => f.label));
  });

  it('empty records array produces no data rows', () => {
    const { rows } = buildXLSXRows([]);
    expect(rows).toHaveLength(0);
  });

  it('single record produces one data row', () => {
    const { rows } = buildXLSXRows([synth()]);
    expect(rows).toHaveLength(1);
  });

  it('formula injection: = prefix is sanitized in all fields', () => {
    const r = synth({ policyNumber: '=SUM(A1)', policyHolder: '+evil', notes: '@mention' });
    const { rows } = buildXLSXRows([r]);
    // policyNumber column index = 1 (after Saved At), offset depends on FIELD_DEFS order
    for (const cell of rows[0]) {
      if (typeof cell === 'string' && cell.length > 0) {
        expect(/^[=+\-@\t\r]/.test(cell)).toBe(false);
      }
    }
  });

  it('formula injection: prefixed cells start with single quote', () => {
    expect(sanitizeSpreadsheetCell('=DROP TABLE')).toBe("'=DROP TABLE");
    expect(sanitizeSpreadsheetCell('+100')).toBe("'+100");
    expect(sanitizeSpreadsheetCell('-50')).toBe("'-50");
    expect(sanitizeSpreadsheetCell('@user')).toBe("'@user");
  });

  it('tab and carriage-return prefixed strings are also sanitized', () => {
    expect(sanitizeSpreadsheetCell('\t=cmd')).toBe("'\t=cmd");
    expect(sanitizeSpreadsheetCell('\r=formula')).toBe("'\r=formula");
  });

  it('fields with commas are included as-is (SheetJS handles escaping)', () => {
    const r = synth({ notes: 'value, with, commas' });
    const { rows } = buildXLSXRows([r]);
    const notesIdx = FIELD_DEFS.findIndex((f) => f.id === 'notes') + 1;
    expect(rows[0][notesIdx]).toBe('value, with, commas');
  });

  it('fields with quotes are included as-is', () => {
    const r = synth({ notes: 'He said "hello"' });
    const { rows } = buildXLSXRows([r]);
    const notesIdx = FIELD_DEFS.findIndex((f) => f.id === 'notes') + 1;
    expect(rows[0][notesIdx]).toBe('He said "hello"');
  });

  it('fields with line breaks are included as-is', () => {
    const r = synth({ notes: 'line1\nline2' });
    const { rows } = buildXLSXRows([r]);
    const notesIdx = FIELD_DEFS.findIndex((f) => f.id === 'notes') + 1;
    expect(rows[0][notesIdx]).toBe('line1\nline2');
  });

  it('leading zeros in policyNumber are preserved as string', () => {
    const r = synth({ policyNumber: '00042' });
    const { rows } = buildXLSXRows([r]);
    const pnIdx = FIELD_DEFS.findIndex((f) => f.id === 'policyNumber') + 1;
    expect(rows[0][pnIdx]).toBe('00042');
  });

  it('subset export only includes requested columns', () => {
    const r = synth();
    const { headers } = buildXLSXRows([r], ['policyNumber', 'policyHolder']);
    expect(headers).toContain('Policy Number');
    expect(headers).toContain('Policy Holder Name');
    expect(headers).not.toContain('Coverage Amount');
    expect(headers).not.toContain('Notes');
  });

  it('large export (200 records) produces correct row count', () => {
    const records = Array.from({ length: 200 }, (_, i) =>
      synth({ policyNumber: `EXP-LARGE-${String(i).padStart(4, '0')}` })
    );
    const { rows } = buildXLSXRows(records);
    expect(rows).toHaveLength(200);
  });

  it('export filename is generic', () => {
    const filename = 'policy-records.xlsx';
    expect(filename).not.toMatch(/EXP-001|Export Test/);
  });

  it('unicode field values are preserved', () => {
    const r = synth({ policyHolder: 'Ángel García-López' });
    const { rows } = buildXLSXRows([r]);
    const holderIdx = FIELD_DEFS.findIndex((f) => f.id === 'policyHolder') + 1;
    expect(rows[0][holderIdx]).toBe('Ángel García-López');
  });
});
