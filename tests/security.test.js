/**
 * security.test.js
 *
 * Security-sensitive behavior checks.
 * Covers edge-cases.md §8 and security.md requirements.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeSpreadsheetCell, normalizeWhitespace } from '../src/utils/normalize.js';
import { escapeHtml, safeText } from '../src/utils/sanitize.js';
import { validateRecord } from '../src/schema/record.js';
import { createRecord } from '../src/schema/record.js';

// ─── Formula injection ────────────────────────────────────────────────────────

describe('Formula injection mitigation', () => {
  const formulaInputs = ['=SUM(A1)', '+SUM()', '-1+1', '@malicious', '\t=cmd', '\r=formula'];
  formulaInputs.forEach((input) => {
    it(`prefixes formula string: ${JSON.stringify(input)}`, () => {
      const out = sanitizeSpreadsheetCell(input);
      expect(out.startsWith("'")).toBe(true);
    });
  });

  it('does not alter safe policy data', () => {
    expect(sanitizeSpreadsheetCell('POL-00123')).toBe('POL-00123');
  });
});

// ─── HTML escaping ────────────────────────────────────────────────────────────

describe('HTML escaping', () => {
  it('escapes < > & " characters', () => {
    const result = escapeHtml('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).toContain('&quot;');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('escapes apostrophes', () => {
    expect(escapeHtml("O'Brien")).toContain('&#x27;');
  });
});

// ─── safeText ─────────────────────────────────────────────────────────────────

describe('safeText', () => {
  it('returns empty string for null element', () => {
    expect(safeText(null)).toBe('');
  });

  it('returns textContent of element', () => {
    const el = { textContent: '  hello  ' };
    expect(safeText(el)).toBe('  hello  ');
  });
});

// ─── Untrusted portal content treated as data ─────────────────────────────────

describe('Portal content treated as data', () => {
  it('script-like content in a field is stored as text, not executed', () => {
    const malicious = '<script>alert(1)</script>';
    const r = createRecord({
      policyNumber: 'TEST-XSS',
      policyHolder: malicious,
      effectiveDate: '01/01/2025',
    });
    // The value must be stored as-is (the UI renders it via textContent, not innerHTML)
    expect(r.fields.policyHolder).toBe(malicious);
  });

  it('formula-like field value is stored as-is; sanitizeSpreadsheetCell is applied only at export', () => {
    const r = createRecord({
      policyNumber: '=DROP TABLE',
      policyHolder: 'Test Person',
      effectiveDate: '01/01/2025',
    });
    expect(r.fields.policyNumber).toBe('=DROP TABLE');
    // Export function should prefix it
    expect(sanitizeSpreadsheetCell(r.fields.policyNumber)).toBe("'=DROP TABLE");
  });
});

// ─── Validation rejects malformed records ────────────────────────────────────

describe('Validation of imported records', () => {
  it('rejects records with no id', () => {
    const r = { ...createRecord({ policyNumber: 'T1', policyHolder: 'P', effectiveDate: '01/01/2025' }), id: '' };
    expect(validateRecord(r).valid).toBe(false);
  });

  it('rejects records with unknown schemaVersion', () => {
    const r = { ...createRecord({ policyNumber: 'T2', policyHolder: 'P', effectiveDate: '01/01/2025' }), schemaVersion: 999 };
    expect(validateRecord(r).valid).toBe(false);
  });
});
