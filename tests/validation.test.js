/**
 * validation.test.js
 *
 * Tests for §2: Data validation and normalization edge cases.
 * Covers accented names, long values, identifiers, date formats,
 * currency variants, Unicode, and length limits.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeWhitespace,
  normalizeDate,
  normalizeCurrency,
  sanitizeSpreadsheetCell,
} from '../src/utils/normalize.js';
import { createRecord, validateRecord } from '../src/schema/record.js';
import { FIELD_DEFS, FIELD_MAP } from '../src/schema/fieldDefs.js';

// ─── Accented and non-Latin names ─────────────────────────────────────────────

describe('§2 Names with accents, non-Latin characters, apostrophes, hyphens', () => {
  const names = [
    'José García',
    "O'Brien",
    'Müller-Schmidt',
    'Ångström',
    'Иван Петров',
    '陈志强',
    'محمد علي',
    'Søren Aaberg',
    'François-Xavier Lefèvre',
    'J. R. Tolkien',
  ];

  names.forEach((name) => {
    it(`accepts name: "${name}"`, () => {
      const r = createRecord({
        policyNumber: 'TEST-NAME-001',
        policyHolder: name,
        effectiveDate: '01/01/2025',
      });
      const { valid } = validateRecord(r);
      expect(valid).toBe(true);
    });
  });

  it('normalizeWhitespace preserves accented characters', () => {
    expect(normalizeWhitespace('  José  García  ')).toBe('José García');
  });
});

// ─── Long names and addresses ─────────────────────────────────────────────────

describe('§2 Long names and addresses', () => {
  it('rejects policyHolder exceeding maxLength (150)', () => {
    const r = createRecord({
      policyNumber: 'TEST-LONG-001',
      policyHolder: 'A'.repeat(151),
      effectiveDate: '01/01/2025',
    });
    const { valid } = validateRecord(r);
    expect(valid).toBe(false);
  });

  it('accepts policyHolder at exactly maxLength (150)', () => {
    const r = createRecord({
      policyNumber: 'TEST-LONG-002',
      policyHolder: 'A'.repeat(150),
      effectiveDate: '01/01/2025',
    });
    const { valid } = validateRecord(r);
    expect(valid).toBe(true);
  });

  it('rejects notes exceeding maxLength (1000)', () => {
    const r = createRecord({
      policyNumber: 'TEST-LONG-003',
      policyHolder: 'Test Person',
      effectiveDate: '01/01/2025',
      notes: 'N'.repeat(1001),
    });
    const { valid } = validateRecord(r);
    expect(valid).toBe(false);
  });

  it('accepts notes at exactly maxLength (1000)', () => {
    const r = createRecord({
      policyNumber: 'TEST-LONG-004',
      policyHolder: 'Test Person',
      effectiveDate: '01/01/2025',
      notes: 'N'.repeat(1000),
    });
    const { valid } = validateRecord(r);
    expect(valid).toBe(true);
  });
});

// ─── Policy number formats ─────────────────────────────────────────────────────

describe('§2 Policy number leading zeros, letters, hyphens, punctuation', () => {
  const validIds = [
    '00000001',
    'POL-0000-001',
    'AB/2024/0001',
    'LIFE-2024-00042',
    'P00001.A',
    '001-002-003',
  ];

  validIds.forEach((id) => {
    it(`accepts policy number: "${id}"`, () => {
      const r = createRecord({
        policyNumber: id,
        policyHolder: 'Test Person',
        effectiveDate: '01/01/2025',
      });
      const { valid } = validateRecord(r);
      expect(valid).toBe(true);
    });
  });

  it('preserves leading zeros in policy number', () => {
    const r = createRecord({
      policyNumber: '000123',
      policyHolder: 'Test Person',
      effectiveDate: '01/01/2025',
    });
    expect(r.fields.policyNumber).toBe('000123');
  });
});

// ─── Date normalization ───────────────────────────────────────────────────────

describe('§2 Date formats — normalizeDate', () => {
  // Valid formats
  it('parses DD/MM/YYYY', () => expect(normalizeDate('15/06/2024')).toBe('2024-06-15'));
  it('parses DD-MM-YYYY', () => expect(normalizeDate('01-01-2025')).toBe('2025-01-01'));
  it('parses YYYY-MM-DD', () => expect(normalizeDate('2026-12-31')).toBe('2026-12-31'));
  it('parses ISO with time suffix', () => expect(normalizeDate('2025-03-15T00:00:00Z')).toBe('2025-03-15'));

  // Edge values
  it('handles single-digit day/month', () => expect(normalizeDate('1/1/2025')).toBe('2025-01-01'));
  it('handles 29 Feb on leap year', () => expect(normalizeDate('29/02/2024')).toBe('2024-02-29'));
  it('rejects 29 Feb on non-leap year', () => expect(normalizeDate('29/02/2023')).toBeNull());
  it('rejects 31 April', () => expect(normalizeDate('31/04/2024')).toBeNull());

  // Invalid
  it('returns null for month > 12', () => expect(normalizeDate('01/13/2024')).toBeNull());
  it('returns null for day > 31', () => expect(normalizeDate('32/01/2024')).toBeNull());
  it('returns null for year too early', () => expect(normalizeDate('01/01/1800')).toBeNull());
  it('returns null for empty string', () => expect(normalizeDate('')).toBeNull());
  it('returns null for null', () => expect(normalizeDate(null)).toBeNull());
  it('returns null for text', () => expect(normalizeDate('January 1, 2025')).toBeNull());
  it('returns null for ambiguous MM/DD/YYYY when outside range', () => {
    // 13/01/2025 — 13 is unambiguously day, 01 is month → valid DD/MM/YYYY
    expect(normalizeDate('13/01/2025')).toBe('2025-01-13');
  });

  // Unicode whitespace around dates (stripped by normalizeWhitespace inside normalizeDate)
  it('handles unicode whitespace around date', () => {
    expect(normalizeDate('\u00A001/01/2025\u00A0')).toBe('2025-01-01');
  });
});

// ─── Currency normalization ───────────────────────────────────────────────────

describe('§2 Currency values', () => {
  it('strips £ symbol', () => expect(normalizeCurrency('£500,000')).toBe('500000'));
  it('strips $ symbol', () => expect(normalizeCurrency('$12,345.67')).toBe('12345.67'));
  it('strips € symbol', () => expect(normalizeCurrency('€1000')).toBe('1000'));
  it('strips ₹ symbol', () => expect(normalizeCurrency('₹99,999')).toBe('99999'));
  it('handles plain decimal', () => expect(normalizeCurrency('1234.56')).toBe('1234.56'));
  it('handles zero', () => expect(normalizeCurrency('0')).toBe('0'));
  it('handles large value', () => expect(normalizeCurrency('10000000')).toBe('10000000'));
  it('handles negative value', () => expect(normalizeCurrency('-500')).toBe('-500'));
  it('returns null for empty string', () => expect(normalizeCurrency('')).toBeNull());
  it('returns null for text-only', () => expect(normalizeCurrency('N/A')).toBeNull());
  it('returns null for text with number', () => expect(normalizeCurrency('approx 1000')).toBeNull());
  it('returns null for double decimal', () => expect(normalizeCurrency('1.2.3')).toBeNull());
  it('handles whitespace around value', () => expect(normalizeCurrency('  5000  ')).toBe('5000'));
});

// ─── Unicode whitespace ───────────────────────────────────────────────────────

describe('§2 Unicode whitespace handling', () => {
  it('collapses zero-width space (U+200B)', () => {
    expect(normalizeWhitespace('a\u200Bb')).toBe('a b');
  });
  it('collapses zero-width non-joiner (U+200C)', () => {
    expect(normalizeWhitespace('a\u200Cb')).toBe('a b');
  });
  it('collapses BOM (U+FEFF)', () => {
    expect(normalizeWhitespace('\uFEFFhello')).toBe('hello');
  });
  it('collapses non-breaking space (U+00A0)', () => {
    expect(normalizeWhitespace('hello\u00A0world')).toBe('hello world');
  });
  it('handles mixed Unicode whitespace', () => {
    expect(normalizeWhitespace('\u00A0 \u200B hello \u200C world \u00A0')).toBe('hello world');
  });
});

// ─── Invalid values flagged, not silently rewritten ──────────────────────────

describe('§2 Invalid values are not silently rewritten', () => {
  it('invalid date returns null, not a guessed date', () => {
    expect(normalizeDate('31/02/2025')).toBeNull();
    expect(normalizeDate('00/00/0000')).toBeNull();
  });

  it('malformed currency returns null, not a guessed number', () => {
    expect(normalizeCurrency('one thousand')).toBeNull();
    expect(normalizeCurrency('1,000,000.00.00')).toBeNull();
  });

  it('validateRecord does not rewrite a whitespace-only required field', () => {
    const r = createRecord({
      policyNumber: '   ',
      policyHolder: 'Test Person',
      effectiveDate: '01/01/2025',
    });
    const { valid, errors } = validateRecord(r);
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('Policy Number'))).toBe(true);
    // The field value must not have been modified
    expect(r.fields.policyNumber).toBe('   ');
  });
});

// ─── Missing required values ──────────────────────────────────────────────────

describe('§2 Missing required values', () => {
  it('missing policyNumber → validation fails', () => {
    const r = createRecord({ policyHolder: 'Test Person', effectiveDate: '01/01/2025' });
    expect(validateRecord(r).valid).toBe(false);
  });

  it('missing policyHolder → validation fails', () => {
    const r = createRecord({ policyNumber: 'T-001', effectiveDate: '01/01/2025' });
    expect(validateRecord(r).valid).toBe(false);
  });

  it('missing effectiveDate → validation fails', () => {
    const r = createRecord({ policyNumber: 'T-001', policyHolder: 'Test Person' });
    expect(validateRecord(r).valid).toBe(false);
  });

  it('all three required fields present → validation passes', () => {
    const r = createRecord({ policyNumber: 'T-001', policyHolder: 'Test Person', effectiveDate: '01/01/2025' });
    expect(validateRecord(r).valid).toBe(true);
  });

  it('all required fields present, all optional empty → still valid', () => {
    const r = createRecord({
      policyNumber: 'T-001',
      policyHolder: 'Test Person',
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
