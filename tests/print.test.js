/**
 * print.test.js
 *
 * Tests for §7: Print/PDF output HTML generation logic.
 * Tests buildPrintHTML (the pure HTML string builder) without opening windows.
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../src/utils/sanitize.js';
import { FIELD_DEFS } from '../src/schema/fieldDefs.js';
import { createRecord } from '../src/schema/record.js';
import { buildPrintHTML, buildRecordHTML } from '../src/export/printTemplate.js';

function synth(overrides = {}) {
  return createRecord({
    policyNumber: 'PRT-001',
    policyHolder: 'Print Test',
    effectiveDate: '01/06/2025',
    expiryDate: '01/06/2026',
    coverageAmount: '250000',
    premiumAmount: '8500',
    policyType: 'Life',
    notes: '',
    ...overrides,
  });
}

// ─── Single record output ─────────────────────────────────────────────────────

describe('§7 Print HTML — single record', () => {
  it('contains "Policy Records" heading', () => {
    const html = buildPrintHTML([synth()], FIELD_DEFS);
    expect(html).toContain('<h1>Policy Records</h1>');
  });

  it('contains the policy number value', () => {
    const html = buildPrintHTML([synth({ policyNumber: 'PRT-SINGLE-001' })], FIELD_DEFS);
    expect(html).toContain('PRT-SINGLE-001');
  });

  it('contains all configured field labels', () => {
    const html = buildPrintHTML([synth()], FIELD_DEFS);
    for (const def of FIELD_DEFS) {
      expect(html).toContain(escapeHtml(def.label));
    }
  });
});

// ─── Multiple records and page breaks ─────────────────────────────────────────

describe('§7 Print HTML — multiple records with page breaks', () => {
  it('inserts a page-break div between records', () => {
    const r1 = synth({ policyNumber: 'PRT-MULTI-001' });
    const r2 = synth({ policyNumber: 'PRT-MULTI-002' });
    const html = buildPrintHTML([r1, r2], FIELD_DEFS);
    expect(html).toContain('page-break');
  });

  it('contains both policy numbers', () => {
    const r1 = synth({ policyNumber: 'PRT-MULTI-001' });
    const r2 = synth({ policyNumber: 'PRT-MULTI-002' });
    const html = buildPrintHTML([r1, r2], FIELD_DEFS);
    expect(html).toContain('PRT-MULTI-001');
    expect(html).toContain('PRT-MULTI-002');
  });

  it('zero records produces valid HTML without records section', () => {
    const html = buildPrintHTML([], FIELD_DEFS);
    expect(html).toContain('<h1>Policy Records</h1>');
    expect(html).not.toContain('Policy Record</div>'); // no record blocks
  });
});

// ─── Empty optional fields ────────────────────────────────────────────────────

describe('§7 Print HTML — empty optional fields', () => {
  it('shows dash placeholder for empty optional field', () => {
    const r = synth({ expiryDate: '', coverageAmount: '', notes: '' });
    const html = buildRecordHTML(r, FIELD_DEFS);
    expect(html).toContain('—</em>');
  });

  it('does not show undefined or null in output', () => {
    const r = synth({ expiryDate: undefined });
    const html = buildRecordHTML(r, FIELD_DEFS);
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('null');
  });
});

// ─── Long names and very large values ─────────────────────────────────────────

describe('§7 Print HTML — long names and large values', () => {
  it('long policy holder name is included without truncation', () => {
    const longName = 'A'.repeat(150);
    const r = synth({ policyHolder: longName });
    const html = buildRecordHTML(r, FIELD_DEFS);
    expect(html).toContain(longName);
  });

  it('very large coverage amount is rendered as text', () => {
    const r = synth({ coverageAmount: '999999999999' });
    const html = buildRecordHTML(r, FIELD_DEFS);
    expect(html).toContain('999999999999');
  });
});

// ─── HTML escaping / hostile markup in print output ──────────────────────────

describe('§7 Print HTML — HTML escaping of field values', () => {
  it('script tag in field value is escaped, not injected', () => {
    const r = synth({ policyHolder: '<script>alert("xss")</script>' });
    const html = buildRecordHTML(r, FIELD_DEFS);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('HTML entities in field value are escaped', () => {
    const r = synth({ notes: 'AT&T — R&D <department>' });
    const html = buildRecordHTML(r, FIELD_DEFS);
    expect(html).toContain('&amp;');
    expect(html).toContain('&lt;');
  });

  it('apostrophe in name is escaped', () => {
    const r = synth({ policyHolder: "O'Brien" });
    const html = buildRecordHTML(r, FIELD_DEFS);
    expect(html).toContain('&#x27;');
  });

  it('double-quotes in value are escaped', () => {
    const r = synth({ notes: 'He said "hello"' });
    const html = buildRecordHTML(r, FIELD_DEFS);
    expect(html).toContain('&quot;');
  });
});

// ─── Subset field export ───────────────────────────────────────────────────────

describe('§7 Print HTML — field subset selection', () => {
  it('only requested fields appear as table rows', () => {
    const defs = FIELD_DEFS.filter((f) => ['policyNumber', 'policyHolder'].includes(f.id));
    const r = synth();
    const html = buildRecordHTML(r, defs);
    expect(html).toContain('Policy Number');
    expect(html).toContain('Policy Holder Name');
    expect(html).not.toContain('Coverage Amount');
    expect(html).not.toContain('Notes');
  });
});

// ─── print output excludes UI controls ───────────────────────────────────────

describe('§7 Print HTML — no UI controls or metadata', () => {
  it('print HTML does not contain button elements', () => {
    const html = buildPrintHTML([synth()], FIELD_DEFS);
    expect(html).not.toContain('<button');
  });

  it('print HTML does not contain input elements', () => {
    const html = buildPrintHTML([synth()], FIELD_DEFS);
    expect(html).not.toContain('<input');
  });
});
