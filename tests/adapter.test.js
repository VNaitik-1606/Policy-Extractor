/**
 * adapter.test.js
 *
 * Tests for the extraction adapter registry.
 * Uses the placeholder adapter (no real portal selectors).
 */

import { describe, it, expect } from 'vitest';
import { getAdapter, runExtraction } from '../src/extraction/adapter.js';
import { placeholderAdapter } from '../src/extraction/placeholder-adapter.js';

describe('getAdapter', () => {
  it('returns placeholder adapter for unrecognized origin', () => {
    const adapter = getAdapter('https://unknown.example.com');
    expect(adapter.id).toBe('placeholder');
  });

  it('placeholder adapter has empty hostPatterns', () => {
    expect(placeholderAdapter.hostPatterns).toEqual([]);
  });
});

describe('runExtraction', () => {
  it('returns isPlaceholder: true for placeholder adapter', () => {
    const result = runExtraction({}, 'https://unknown.example.com');
    expect(result.isPlaceholder).toBe(true);
  });

  it('does not include _isPlaceholder key in fields', () => {
    const result = runExtraction({}, 'https://unknown.example.com');
    expect(result.fields).not.toHaveProperty('_isPlaceholder');
  });

  it('returns adapterId: "placeholder" for unrecognized origin', () => {
    const result = runExtraction({}, 'https://unknown.example.com');
    expect(result.adapterId).toBe('placeholder');
  });

  it('fields object contains expected stub keys', () => {
    const result = runExtraction({}, 'https://unknown.example.com');
    expect(result.fields).toHaveProperty('policyNumber');
    expect(result.fields).toHaveProperty('policyHolder');
  });
});
