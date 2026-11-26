/**
 * service-worker.js — MV3 Background Service Worker
 *
 * Minimal background worker. Handles:
 * - Opening the dashboard in a new tab.
 * - Relaying extraction requests from the popup to the active tab's content script.
 *
 * No policy data is stored or logged here.
 */

// Open dashboard in a new tab when the user clicks the action button
// while on a page where the popup cannot inject content.
chrome.runtime.onInstalled.addListener(() => {
  console.log('[PolicyExtractor] Extension installed.');
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'OPEN_DASHBOARD') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === 'REQUEST_EXTRACTION') {
    // Forward the extraction request to the content script on the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0];
      if (!tab?.id) {
        sendResponse({ ok: false, error: 'No active tab found.' });
        return;
      }
      chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_FIELDS' }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            ok: false,
            error:
              'Could not connect to the page. Make sure you are on a supported portal page and reload if necessary.',
          });
        } else {
          sendResponse(response);
        }
      });
    });
    return true; // async
  }

  return false;
});
