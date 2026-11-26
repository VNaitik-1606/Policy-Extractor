import React, { useState, useCallback } from 'react';
import ReviewForm from '../review/ReviewForm.jsx';

/** Popup states */
const STATE = {
  IDLE: 'idle',
  EXTRACTING: 'extracting',
  REVIEWING: 'reviewing',
  SAVING: 'saving',
  SAVED: 'saved',
  ERROR: 'error',
};

export default function Popup() {
  const [state, setState] = useState(STATE.IDLE);
  const [extraction, setExtraction] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedId, setSavedId] = useState(null);

  const handleExtract = useCallback(async () => {
    setState(STATE.EXTRACTING);
    setErrorMsg('');
    try {
      const response = await chrome.runtime.sendMessage({ type: 'REQUEST_EXTRACTION' });
      if (!response?.ok) {
        setErrorMsg(response?.error ?? 'Extraction failed.');
        setState(STATE.ERROR);
        return;
      }
      setExtraction(response);
      setState(STATE.REVIEWING);
    } catch (err) {
      setErrorMsg('Could not communicate with the extension. Try reloading the page.');
      setState(STATE.ERROR);
    }
  }, []);

  const handleSaved = useCallback((id) => {
    setSavedId(id);
    setState(STATE.SAVED);
  }, []);

  const handleDiscard = useCallback(() => {
    setExtraction(null);
    setState(STATE.IDLE);
  }, []);

  const handleOpenDashboard = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
  }, []);

  return (
    <div className="w-80 font-sans text-sm text-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between bg-blue-700 px-4 py-3">
        <span className="font-semibold text-white tracking-wide">Policy Extractor</span>
        <button
          onClick={handleOpenDashboard}
          className="text-blue-100 hover:text-white text-xs underline"
          title="Open full dashboard"
        >
          Dashboard ↗
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* IDLE */}
        {state === STATE.IDLE && (
          <>
            <p className="text-gray-600 leading-snug">
              Navigate to a policy page on your portal, then click <strong>Extract fields</strong>.
            </p>
            <button
              onClick={handleExtract}
              className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              Extract fields
            </button>
          </>
        )}

        {/* EXTRACTING */}
        {state === STATE.EXTRACTING && (
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Extracting…
          </div>
        )}

        {/* REVIEWING */}
        {state === STATE.REVIEWING && extraction && (
          <ReviewForm
            extraction={extraction}
            onSaved={handleSaved}
            onDiscard={handleDiscard}
          />
        )}

        {/* SAVED */}
        {state === STATE.SAVED && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <span>✓</span> Record saved.
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOpenDashboard}
                className="flex-1 rounded bg-blue-600 px-3 py-2 text-white text-xs hover:bg-blue-700"
              >
                View in Dashboard
              </button>
              <button
                onClick={() => setState(STATE.IDLE)}
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
              >
                Extract another
              </button>
            </div>
          </div>
        )}

        {/* ERROR */}
        {state === STATE.ERROR && (
          <div className="space-y-3">
            <div className="rounded bg-red-50 border border-red-200 p-3 text-red-800 text-xs leading-snug">
              {errorMsg}
            </div>
            <button
              onClick={() => setState(STATE.IDLE)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
