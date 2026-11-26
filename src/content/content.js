/**
 * content.js — Content Script
 *
 * Injected only into pages matching the manifest's content_scripts.matches list.
 * Listens for a message from the popup/background, runs extraction, and returns
 * the raw field map. It never sends the full page source or any data
 * beyond the configured fields.
 *
 * Security notes:
 * - Portal content is treated as untrusted data throughout.
 * - Only extracted field values (strings) are sent back — no DOM nodes, no HTML.
 * - The script does nothing until explicitly asked by the user via the popup.
 */

import { runExtraction } from '../extraction/adapter.js';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'EXTRACT_FIELDS') return false;

  try {
    const origin = window.location.origin;
    const result = runExtraction(document, origin);
    sendResponse({ ok: true, ...result, origin });
  } catch (err) {
    // Do not include page content in error messages
    console.error('[PolicyExtractor] Extraction error:', err?.message ?? 'Unknown error');
    sendResponse({ ok: false, error: 'Extraction failed. See browser console for details.' });
  }

  // Return true to keep the message channel open for the async response
  return true;
});
