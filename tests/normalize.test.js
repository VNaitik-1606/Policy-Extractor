/**
 * normalize.test.js
 *
 * Tests for normalization and sanitization utilities.
 * Covers edge cases from edge-cases.md §2.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeWhitespace,
  normalizeDate,
  normalizeCurrency,
  sanitizeSpreadsheetCell,
} from '../src/utils/normalize.js';

// ─── normalizeWhitespace ──────────────────────────────────────────────────────

describe('normalizeWhitespace', () => {
  it('trims edges', () => expect(normalizeWhitespace('  hello  ')).toBe('hello'));
  it('collapses internal spaces', () => expect(normalizeWhitespace('a  b   c')).toBe('a b c'));
  it('replaces non-breaking spaces', () => expect(normalizeWhitespace('a\u00A0b')).toBe('a b'));
  it('returns empty string for non-string input', () => expect(normalizeWhitespace(null)).toBe(''));
  it('handles tabs and newlines', () => expect(normalizeWhitespace('a\t\nb')).toBe('a b'));
});

// ─── normalizeDate ────────────────────────────────────────────────────────────

describe('normalizeDate', () => {
  it('parses DD/MM/YYYY', () => expect(normalizeDate('01/06/2024')).toBe('2024-06-01'));
  it('parses DD-MM-YYYY', () => expect(normalizeDate('31-12-2023')).toBe('2023-12-31'));
  it('parses YYYY-MM-DD', () => expect(normalizeDate('2025-01-15')).toBe('2025-01-15'));
  it('returns null for invalid month', () => expect(normalizeDate('01/13/2024')).toBeNull());
  it('returns null for invalid day', () => expect(normalizeDate('32/01/2024')).toBeNull());
  it('returns null for empty string', () => expect(normalizeDate('')).toBeNull());
  it('returns null for null', () => expect(normalizeDate(null)).toBeNull());
  it('returns null for clearly invalid date', () => expect(normalizeDate('not-a-date')).toBeNull());
  it('handles leading zeros preserved', () => expect(normalizeDate('05/01/2025')).toBe('2025-01-05'));
  it('rejects Feb 30', () => expect(normalizeDate('30/02/2024')).toBeNull());
});

// ─── normalizeCurrency ────────────────────────────────────────────────────────

describe('normalizeCurrency', () => {
  it('strips currency symbols', () => expect(normalizeCurrency('£1000')).toBe('1000'));
  // normalizeCurrency strips commas; '1,00,000' → '100000' (valid after strip)
  it('strips commas and returns numeric string', () => expect(normalizeCurrency('1,00,000')).toBe('100000'));
  it('handles plain integer', () => expect(normalizeCurrency('500000')).toBe('500000'));
  it('handles decimal', () => expect(normalizeCurrency('12345.67')).toBe('12345.67'));
  it('returns null for empty', () => expect(normalizeCurrency('')).toBeNull());
  it('returns null for text', () => expect(normalizeCurrency('N/A')).toBeNull());
  it('handles negative', () => expect(normalizeCurrency('-100')).toBe('-100'));
  it('strips rupee symbol', () => expect(normalizeCurrency('₹5000')).toBe('5000'));
});

// ─── sanitizeSpreadsheetCell ──────────────────────────────────────────────────

describe('sanitizeSpreadsheetCell', () => {
  it('prefixes = with single quote', () => expect(sanitizeSpreadsheetCell('=SUM(A1)')).toBe("'=SUM(A1)"));
  it('prefixes + with single quote', () => expect(sanitizeSpreadsheetCell('+100')).toBe("'+100"));
  it('prefixes - with single quote', () => expect(sanitizeSpreadsheetCell('-100')).toBe("'-100"));
  it('prefixes @ with single quote', () => expect(sanitizeSpreadsheetCell('@user')).toBe("'@user"));
  it('leaves normal strings unchanged', () => expect(sanitizeSpreadsheetCell('Hello')).toBe('Hello'));
  it('leaves numbers unchanged', () => expect(sanitizeSpreadsheetCell('12345')).toBe('12345'));
  it('handles empty string', () => expect(sanitizeSpreadsheetCell('')).toBe(''));
  it('handles non-string passthrough', () => expect(sanitizeSpreadsheetCell(123)).toBe(123));
});
