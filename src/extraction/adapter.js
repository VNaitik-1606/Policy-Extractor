/**
 * adapter.js
 *
 * Adapter registry and dispatch.
 * Selects the correct extraction adapter based on the current page's origin.
 * Falls back to the placeholder adapter if no matching adapter is registered.
 */

import { placeholderAdapter } from './placeholder-adapter.js';

/**
 * Register additional adapters here when portal domains are confirmed.
 * Each adapter must have: { id, hostPatterns: string[], extract(document) }
 */
const ADAPTERS = [
  // e.g.: import { myPortalAdapter } from './my-portal-adapter.js';
  //       myPortalAdapter,
];

/**
 * Find the adapter whose hostPatterns match the given origin.
 * Returns the placeholder adapter if none match.
 *
 * @param {string} origin - e.g. "https://portal.example.com"
 * @returns {Object} adapter
 */
export function getAdapter(origin) {
  for (const adapter of ADAPTERS) {
    if (adapter.hostPatterns.some((pattern) => matchesPattern(pattern, origin))) {
      return adapter;
    }
  }
  return placeholderAdapter;
}

/**
 * Run extraction using the appropriate adapter.
 *
 * @param {Document} document
 * @param {string} origin
 * @returns {{ fields: Object, isPlaceholder: boolean, adapterId: string }}
 */
export function runExtraction(document, origin) {
  const adapter = getAdapter(origin);
  const raw = adapter.extract(document);
  const { _isPlaceholder, ...fields } = raw;
  return {
    fields,
    isPlaceholder: !!_isPlaceholder,
    adapterId: adapter.id,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Very simple host-pattern matcher.
 * Supports exact origins and trailing-wildcard patterns like
 * "https://*.example.com" or "https://portal.example.com".
 */
export function matchesPattern(pattern, origin) {
  if (pattern.includes('*')) {
    // Convert glob to regex: escape regex special chars (except *), replace * with [^/]+
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '[^/]+');
    return new RegExp(`^${escaped}$`).test(origin);
  }
  return pattern === origin;
}
