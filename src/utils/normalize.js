/**
 * normalize.js
 *
 * Value normalization helpers.
 * These clean up raw text before display in the review form.
 * They do NOT silently rewrite invalid values into plausible ones.
 */

/** Collapse internal whitespace and trim edges. */
export function normalizeWhitespace(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]+/g, ' ').trim();
}

/**
 * Attempt to parse and normalize a date string to YYYY-MM-DD.
 * Supports DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, and ISO variants.
 * Returns the normalized string on success, or null if ambiguous/invalid.
 */
export function normalizeDate(str) {
  if (!str || typeof str !== 'string') return null;
  const s = normalizeWhitespace(str);

  // YYYY-MM-DD or ISO
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return validateDateParts(d, m, y);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return validateDateParts(d, m, y);
  }

  return null;
}

/**
 * Remove currency symbols, commas, and normalize to a string like "1234.56".
 * Returns the cleaned string or null for clearly invalid input.
 */
export function normalizeCurrency(str) {
  if (!str || typeof str !== 'string') return null;
  // Strip known currency symbols, commas, whitespace
  const cleaned = str.replace(/[£$€₹,\s]/g, '').trim();
  if (cleaned === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return cleaned;
}

/** Sanitize a string for safe text rendering (no HTML interpretation). */
export function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return normalizeWhitespace(str);
}

/**
 * Prefix spreadsheet formula characters to prevent injection.
 * Per OWASP: prefix with a single quote if the value starts with = + - @ TAB CR
 */
export function sanitizeSpreadsheetCell(str) {
  if (typeof str !== 'string') return str;
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function validateDateParts(d, m, y) {
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  const year = parseInt(y, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2200) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
