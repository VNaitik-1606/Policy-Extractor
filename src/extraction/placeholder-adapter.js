/**
 * placeholder-adapter.js
 *
 * Placeholder extraction adapter.
 *
 * This adapter is used until the real portal domain and page structure are
 * confirmed by the user. It returns synthetic stub values so the rest of the
 * application (review form, storage, exports) can be developed and tested
 * independently.
 *
 * HOW TO ADD A REAL ADAPTER
 * ─────────────────────────
 * 1. Create  src/extraction/my-portal-adapter.js
 * 2. Set `hostPatterns` to the actual portal origin patterns.
 * 3. Implement `extract(document)` using real, confirmed CSS selectors.
 * 4. Update adapter.js to import and register your adapter.
 * 5. Update manifest.json host_permissions and content_scripts.matches.
 *
 * Do NOT guess selectors. Obtain them from a real, authorized portal page.
 */

export const placeholderAdapter = {
  id: 'placeholder',

  /**
   * Domains this adapter handles.
   * Empty until the real portal domain is supplied.
   */
  hostPatterns: [],

  /**
   * Returns a stub field map for UI development and testing.
   * In production this would walk the portal DOM with real selectors.
   *
   * @param {Document} _document - The portal page document (unused here)
   * @returns {{ fieldId: string|null, _isPlaceholder: true }}
   */
  extract(_document) {
    return {
      _isPlaceholder: true,
      policyNumber: 'POL-000000',
      policyHolder: 'Sample Name',
      effectiveDate: '01/01/2025',
      expiryDate: '31/12/2025',
      coverageAmount: '500000',
      premiumAmount: '12000',
      policyType: 'Sample Type',
      notes: '',
    };
  },
};
