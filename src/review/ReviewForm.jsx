import React, { useState, useCallback, useRef } from 'react';
import { FIELD_DEFS, REQUIRED_FIELD_IDS } from '../schema/fieldDefs.js';
import { createRecord, validateRecord } from '../schema/record.js';
import { normalizeWhitespace } from '../utils/normalize.js';
import db from '../storage/db.js';

/**
 * ReviewForm
 *
 * Shows extracted fields in an editable form.
 * Highlights missing / invalid values.
 * Requires the user to confirm before saving.
 * Allows discarding without saving.
 */
export default function ReviewForm({ extraction, onSaved, onDiscard }) {
  const { fields: rawFields, isPlaceholder, origin } = extraction;

  // Initialise field values from extracted raw text
  const [values, setValues] = useState(() => {
    const init = {};
    for (const def of FIELD_DEFS) {
      init[def.id] = normalizeWhitespace(rawFields?.[def.id] ?? '');
    }
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const saveGuard = useRef(false); // prevent double-save

  const handleChange = useCallback((id, val) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    // Clear per-field error on change
    setFieldErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (saveGuard.current) return;
    saveGuard.current = true;
    setSaving(true);
    setSaveError('');

    const record = createRecord(values, origin ?? '');
    const { valid, errors } = validateRecord(record);

    if (!valid) {
      // Map errors back to field-level hints where possible
      const ferrs = {};
      for (const def of FIELD_DEFS) {
        const related = errors.filter((e) => e.includes(`"${def.label}"`));
        if (related.length > 0) ferrs[def.id] = related[0];
      }
      setFieldErrors(ferrs);
      setSaving(false);
      saveGuard.current = false;
      return;
    }

    try {
      // Check for duplicate policy number
      const existing = await db.records
        .filter((r) => r.fields?.policyNumber === record.fields?.policyNumber)
        .first();

      if (existing) {
        setSaveError(
          `A record with policy number "${record.fields.policyNumber}" already exists. ` +
            'Edit the policy number if this is a different policy, or open the Dashboard to update the existing record.'
        );
        setSaving(false);
        saveGuard.current = false;
        return;
      }

      await db.records.add(record);
      onSaved(record.id);
    } catch (err) {
      console.error('[PolicyExtractor] Save error:', err?.name);
      setSaveError(
        err?.name === 'QuotaExceededError'
          ? 'Storage is full. Free up space or export and delete some records.'
          : 'Could not save the record. Please try again.'
      );
      setSaving(false);
      saveGuard.current = false;
    }
  }, [values, origin, onSaved]);

  return (
    <div className="space-y-3">
      {isPlaceholder && (
        <div className="rounded bg-amber-50 border border-amber-300 px-3 py-2 text-amber-800 text-xs leading-snug">
          ⚙ <strong>Placeholder data.</strong> The extraction adapter is not yet configured for
          this portal. These are synthetic stub values for testing.
        </div>
      )}

      <p className="text-gray-500 text-xs">
        Review the extracted fields below. Edit any incorrect values, then click <strong>Save</strong>.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        noValidate
        className="space-y-2"
      >
        {FIELD_DEFS.map((def) => {
          const err = fieldErrors[def.id];
          const isRequired = REQUIRED_FIELD_IDS.includes(def.id);
          const isEmpty = !values[def.id]?.trim();

          return (
            <div key={def.id}>
              <label
                htmlFor={`field-${def.id}`}
                className="block text-xs font-medium text-gray-700 mb-0.5"
              >
                {def.label}
                {isRequired && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {def.id === 'notes' ? (
                <textarea
                  id={`field-${def.id}`}
                  rows={2}
                  value={values[def.id]}
                  onChange={(e) => handleChange(def.id, e.target.value)}
                  maxLength={def.maxLength}
                  className={`w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                    err
                      ? 'border-red-400 focus:ring-red-400'
                      : isRequired && isEmpty
                      ? 'border-amber-400 focus:ring-amber-400'
                      : 'border-gray-300 focus:ring-blue-400'
                  }`}
                />
              ) : (
                <input
                  id={`field-${def.id}`}
                  type="text"
                  value={values[def.id]}
                  onChange={(e) => handleChange(def.id, e.target.value)}
                  maxLength={def.maxLength}
                  aria-required={isRequired}
                  aria-describedby={err ? `err-${def.id}` : undefined}
                  className={`w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                    err
                      ? 'border-red-400 focus:ring-red-400'
                      : isRequired && isEmpty
                      ? 'border-amber-400 focus:ring-amber-400'
                      : 'border-gray-300 focus:ring-blue-400'
                  }`}
                />
              )}
              {err && (
                <p id={`err-${def.id}`} className="text-red-600 text-xs mt-0.5">
                  {err}
                </p>
              )}
              {!err && isRequired && isEmpty && (
                <p className="text-amber-600 text-xs mt-0.5">Required — please enter a value.</p>
              )}
            </div>
          );
        })}

        {saveError && (
          <div className="rounded bg-red-50 border border-red-200 p-2 text-red-800 text-xs leading-snug">
            {saveError}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save record'}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Discard
          </button>
        </div>
      </form>
    </div>
  );
}
