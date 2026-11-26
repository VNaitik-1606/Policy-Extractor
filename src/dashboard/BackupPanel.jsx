import React, { useState, useRef } from 'react';
import { exportBackup, previewImport, commitImport } from '../storage/backup.js';

export default function BackupPanel({ onDone }) {
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState(null); // { records, duplicates }
  const [dupStrategy, setDupStrategy] = useState('skip');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const handleExport = async () => {
    setBusy(true);
    setStatus('');
    try {
      const { count } = await exportBackup();
      setStatus(`✓ Backup downloaded — ${count} record(s).`);
    } catch (err) {
      setStatus('Export failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus('');
    setPreview(null);
    try {
      const result = await previewImport(file);
      if (!result.valid) {
        setStatus('Backup file is invalid:\n' + result.errors.join('\n'));
        return;
      }
      setPreview(result);
      setStatus(`File loaded: ${result.records.length} record(s), ${result.duplicates.length} already exist.`);
    } catch {
      setStatus('Could not read the file.');
    } finally {
      setBusy(false);
      // Reset input so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    setBusy(true);
    setStatus('');
    try {
      const { added, overwritten, skipped } = await commitImport(preview.records, dupStrategy);
      setStatus(`✓ Import complete — ${added} added, ${overwritten} updated, ${skipped} skipped.`);
      setPreview(null);
      onDone();
    } catch {
      setStatus('Import failed. Your existing records were not changed.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setStatus('');
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-blue-900">Backup &amp; Restore</h2>
        <button onClick={onDone} className="text-xs text-blue-500 hover:underline">Close</button>
      </div>

      {status && (
        <div
          className={`rounded px-3 py-2 text-xs whitespace-pre-wrap leading-snug ${
            status.startsWith('✓')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {status}
        </div>
      )}

      {/* Backup */}
      <div className="space-y-1">
        <p className="text-xs text-gray-600 font-medium">Export backup</p>
        <p className="text-xs text-gray-500">
          Downloads all records as a JSON backup file. Store it somewhere safe — it contains your policy data.
        </p>
        <button
          onClick={handleExport}
          disabled={busy}
          className="rounded bg-blue-600 px-4 py-2 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Download backup
        </button>
      </div>

      <hr className="border-blue-200" />

      {/* Restore */}
      <div className="space-y-1">
        <p className="text-xs text-gray-600 font-medium">Restore from backup</p>
        <p className="text-xs text-gray-500">
          Select a backup file to preview it. Your existing records will not be changed until you confirm.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          disabled={busy}
          className="text-xs"
          aria-label="Select backup file"
        />
      </div>

      {/* Import preview */}
      {preview && (
        <div className="space-y-3 bg-white rounded border border-blue-200 p-3">
          <p className="text-xs font-medium text-gray-700">
            {preview.records.length} record(s) in backup file
          </p>

          {preview.duplicates.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-amber-700 font-medium">
                {preview.duplicates.length} record(s) already exist in your database.
              </p>
              <div className="flex gap-3 text-xs">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="dup"
                    value="skip"
                    checked={dupStrategy === 'skip'}
                    onChange={() => setDupStrategy('skip')}
                  />
                  Skip duplicates (keep existing)
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="dup"
                    value="overwrite"
                    checked={dupStrategy === 'overwrite'}
                    onChange={() => setDupStrategy('overwrite')}
                  />
                  Overwrite with backup version
                </label>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={busy}
              className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Importing…' : 'Confirm import'}
            </button>
            <button
              onClick={handleCancel}
              disabled={busy}
              className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
