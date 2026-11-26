/**
 * sanitize.js
 *
 * Safe text extraction from DOM nodes.
 * Never use innerHTML; always treat portal content as untrusted data.
 */

/**
 * Safely get the text content of a DOM element.
 * Returns an empty string if the element is null/undefined.
 */
export function safeText(el) {
  if (!el) return '';
  // textContent is safe — it does not execute scripts or parse HTML
  return typeof el.textContent === 'string' ? el.textContent : '';
}

/**
 * Set text content on a DOM element safely (no innerHTML).
 */
export function setTextContent(el, text) {
  if (!el) return;
  el.textContent = typeof text === 'string' ? text : '';
}

/**
 * Escape HTML special characters for embedding in HTML templates.
 * Use only when constructing HTML strings is unavoidable (e.g. print template).
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
