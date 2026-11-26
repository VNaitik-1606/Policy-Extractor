import React, { useState, useEffect, useCallback, useRef } from 'react';
import db from '../storage/db.js';
import { FIELD_DEFS } from '../schema/fieldDefs.js';
import { updateRecord, validateRecord } from '../schema/record.js';
import { normalizeWhitespace } from '../utils/normalize.js';
import { exportJSON } from '../export/jsonExport.js';
import { exportXLSX } from '../export/xlsxExport.js';
import { printRecords } from '../export/printTemplate.js';
import BackupPanel from './BackupPanel.jsx';

const SORT_FIELDS = [
  { id: 'createdAt', label: 'Date saved' },
  { id: 'policyNumber', label: 'Policy number' },
  { id: 'policyHolder', label: 'Policy holder' },
];

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null); // { record, values, errors }
  const [confirmDelete, setConfirmDelete] = useState(null); // record id or 'selected'
  const [statusMsg, setStatusMsg] = useState('');
  const [showBackup, setShowBackup] = useState(false);
  const statusTimer = useRef(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const all = await db.records.orderBy('createdAt').toArray();
      setRecords(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const showStatus = useCallback((msg) => {
    setStatusMsg(msg);
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatusMsg(''), 4000);
  }, []);

  // ── Filtering & sorting ──────────────────────────────────────────────────

  const filtered = records
    .filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.fields?.policyNumber?.toLowerCase().includes(q) ||
        r.fields?.policyHolder?.toLowerCase().includes(q) ||
        r.fields?.policyType?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let va = sortBy === 'createdAt' ? a.createdAt : a.fields?.[sortBy] ?? '';
      let vb = sortBy === 'createdAt' ? b.createdAt : b.fields?.[sortBy] ?? '';
      va = va.toLowerCase?.() ?? va;
      vb = vb.toLowerCase?.() ?? vb;
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  // ── Selection ───────────────────────────────────────────────────────────

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  };

  const getSelectedRecords = () =>
    selected.size > 0
      ? records.filter((r) => selected.has(r.id))
      : records;

  // ── Delete ──────────────────────────────────────────────────────────────

  const handleDeleteConfirmed = useCallback(async () => {
    if (!confirmDelete) return;
    if (confirmDelete === 'selected') {
      await db.records.bulkDelete([...selected]);
      setSelected(new Set());
      showStatus(`${selected.size} record(s) deleted.`);
    } else {
      await db.records.delete(confirmDelete);
      showStatus('Record deleted.');
    }
    setConfirmDelete(null);
    loadRecords();
  }, [confirmDelete, selected, loadRecords, showStatus]);

  // ── Edit ────────────────────────────────────────────────────────────────

  const startEdit = (record) => {
    const values = {};
    for (const def of FIELD_DEFS) {
      values[def.id] = record.fields?.[def.id] ?? '';
    }
    setEditing({ record, values, errors: {} });
  };

  const handleEditChange = (id, val) => {
    setEditing((prev) => ({
      ...prev,
      values: { ...prev.values, [id]: val },
      errors: { ...prev.errors, [id]: undefined },
    }));
  };

  const handleEditSave = async () => {
    const updated = updateRecord(editing.record, editing.values);
    const { valid, errors } = validateRecord(updated);
    if (!valid) {
      const ferrs = {};
      for (const def of FIELD_DEFS) {
        const related = errors.filter((e) => e.includes(`"${def.label}"`));
        if (related.length > 0) ferrs[def.id] = related[0];
      }
      setEditing((prev) => ({ ...prev, errors: ferrs }));
      return;
    }
    await db.records.put(updated);
    setEditing(null);
    showStatus('Record updated.');
    loadRecords();
  };

  // ── Export ──────────────────────────────────────────────────────────────

  const handleExportJSON = () => {
    const count = exportJSON(getSelectedRecords());
    showStatus(`Exported ${count} record(s) to JSON.`);
  };

  const handleExportXLSX = () => {
    const count = exportXLSX(getSelectedRecords());
    showStatus(`Exported ${count} record(s) to Excel.`);
  };

  const handlePrint = () => {
    printRecords(getSelectedRecords());
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-sm text-gray-900">
      {/* Header */}
      <header className="bg-blue-700 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-white text-lg font-semibold tracking-wide">Policy Extractor</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowBackup((v) => !v)}
              className="rounded bg-blue-600 px-4 py-1.5 text-white text-xs hover:bg-blue-500"
            >
              Backup / Restore
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {/* Status banner */}
        {statusMsg && (
          <div className="rounded bg-green-50 border border-green-200 px-4 py-2 text-green-800 text-sm">
            {statusMsg}
          </div>
        )}

        {/* Backup panel */}
        {showBackup && (
          <BackupPanel onDone={() => { setShowBackup(false); loadRecords(); }} />
        )}

        {/* Search + sort bar */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search by policy number, name, or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            aria-label="Search records"
          />
          <label htmlFor="sort-select" className="text-xs text-gray-500">Sort by</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {SORT_FIELDS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <button
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            title="Toggle sort direction"
            aria-label={`Sort ${sortDir === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {/* Counts + bulk actions */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>
            {loading ? 'Loading…' : `${records.length} record(s) total, ${filtered.length} shown`}
            {selected.size > 0 && `, ${selected.size} selected`}
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleExportJSON}
              className="rounded bg-gray-100 border border-gray-300 px-3 py-1 hover:bg-gray-200 text-gray-700"
            >
              Export JSON {selected.size > 0 ? `(${selected.size})` : '(all)'}
            </button>
            <button
              onClick={handleExportXLSX}
              className="rounded bg-gray-100 border border-gray-300 px-3 py-1 hover:bg-gray-200 text-gray-700"
            >
              Export Excel {selected.size > 0 ? `(${selected.size})` : '(all)'}
            </button>
            <button
              onClick={handlePrint}
              className="rounded bg-gray-100 border border-gray-300 px-3 py-1 hover:bg-gray-200 text-gray-700"
            >
              Print {selected.size > 0 ? `(${selected.size})` : '(all)'}
            </button>
            {selected.size > 0 && (
              <button
                onClick={() => setConfirmDelete('selected')}
                className="rounded bg-red-50 border border-red-300 px-3 py-1 hover:bg-red-100 text-red-700"
              >
                Delete selected ({selected.size})
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {!loading && filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center text-gray-400">
            {records.length === 0
              ? 'No records yet. Use the extension popup on a policy page to extract your first record.'
              : 'No records match your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-3 w-8 text-left">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                      className="rounded"
                    />
                  </th>
                  <th className="p-3 text-left font-medium text-gray-600 whitespace-nowrap">Policy #</th>
                  <th className="p-3 text-left font-medium text-gray-600 whitespace-nowrap">Holder</th>
                  <th className="p-3 text-left font-medium text-gray-600 whitespace-nowrap">Type</th>
                  <th className="p-3 text-left font-medium text-gray-600 whitespace-nowrap">Effective</th>
                  <th className="p-3 text-left font-medium text-gray-600 whitespace-nowrap">Expiry</th>
                  <th className="p-3 text-left font-medium text-gray-600 whitespace-nowrap">Saved</th>
                  <th className="p-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-gray-50 ${selected.has(r.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        aria-label={`Select record ${r.fields?.policyNumber ?? r.id}`}
                        className="rounded"
                      />
                    </td>
                    <td className="p-3 font-mono text-xs">{r.fields?.policyNumber ?? '—'}</td>
                    <td className="p-3">{r.fields?.policyHolder ?? '—'}</td>
                    <td className="p-3 text-gray-500">{r.fields?.policyType ?? '—'}</td>
                    <td className="p-3 text-gray-500">{r.fields?.effectiveDate ?? '—'}</td>
                    <td className="p-3 text-gray-500">{r.fields?.expiryDate ?? '—'}</td>
                    <td className="p-3 text-gray-400 text-xs whitespace-nowrap">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3 flex gap-2 whitespace-nowrap">
                      <button
                        onClick={() => startEdit(r)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(r.id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Edit modal */}
      {editing && (
        <Modal title="Edit record" onClose={() => setEditing(null)}>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {FIELD_DEFS.map((def) => {
              const err = editing.errors?.[def.id];
              return (
                <div key={def.id}>
                  <label
                    htmlFor={`edit-${def.id}`}
                    className="block text-xs font-medium text-gray-700 mb-0.5"
                  >
                    {def.label}
                    {def.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {def.id === 'notes' ? (
                    <textarea
                      id={`edit-${def.id}`}
                      rows={2}
                      value={editing.values[def.id]}
                      onChange={(e) => handleEditChange(def.id, e.target.value)}
                      maxLength={def.maxLength}
                      className={`w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 ${err ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'}`}
                    />
                  ) : (
                    <input
                      id={`edit-${def.id}`}
                      type="text"
                      value={editing.values[def.id]}
                      onChange={(e) => handleEditChange(def.id, e.target.value)}
                      maxLength={def.maxLength}
                      className={`w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 ${err ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'}`}
                    />
                  )}
                  {err && <p className="text-red-600 text-xs mt-0.5">{err}</p>}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleEditSave}
              className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Save changes
            </button>
            <button
              onClick={() => setEditing(null)}
              className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal title="Confirm deletion" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-gray-600 mb-4">
            {confirmDelete === 'selected'
              ? `Delete ${selected.size} selected record(s)? This cannot be undone.`
              : 'Delete this record? This cannot be undone.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteConfirmed}
              className="flex-1 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-title" className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
