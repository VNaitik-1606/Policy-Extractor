/**
 * ui.test.jsx
 *
 * UI and accessibility tests for Popup, ReviewForm, Dashboard, and BackupPanel.
 * Uses React 18 createRoot + act in jsdom with mocked Dexie db and chrome.runtime.
 * Covers §3 (Review & save workflow) and §9 (Usability & accessibility) edge cases.
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Enable React act() environment
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// ─── Mock chrome.runtime ──────────────────────────────────────────────────────

const mockSendMessage = vi.fn();
globalThis.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
  },
};

// ─── Mock Dexie db ────────────────────────────────────────────────────────────

const { mockRecordsStore, mockDb } = vi.hoisted(() => {
  const mockRecordsStore = { items: [] };
  const mockDb = {
    records: {
      orderBy: () => ({
        toArray: vi.fn(async () => [...mockRecordsStore.items]),
      }),
      filter: (fn) => ({
        first: vi.fn(async () => mockRecordsStore.items.find(fn)),
      }),
      add: vi.fn(async (rec) => {
        mockRecordsStore.items.push(rec);
        return rec.id;
      }),
      put: vi.fn(async (rec) => {
        const idx = mockRecordsStore.items.findIndex((r) => r.id === rec.id);
        if (idx >= 0) mockRecordsStore.items[idx] = rec;
        else mockRecordsStore.items.push(rec);
      }),
      delete: vi.fn(async (id) => {
        mockRecordsStore.items = mockRecordsStore.items.filter((r) => r.id !== id);
      }),
      bulkDelete: vi.fn(async (ids) => {
        const set = new Set(ids);
        mockRecordsStore.items = mockRecordsStore.items.filter((r) => !set.has(r.id));
      }),
      where: () => ({
        anyOf: (ids) => ({
          toArray: vi.fn(async () => mockRecordsStore.items.filter((r) => ids.includes(r.id))),
        }),
      }),
    },
  };
  return { mockRecordsStore, mockDb };
});

vi.mock('../src/storage/db.js', () => ({
  default: mockDb,
}));

import Popup from '../src/popup/Popup.jsx';
import ReviewForm from '../src/review/ReviewForm.jsx';
import Dashboard from '../src/dashboard/Dashboard.jsx';
import { createRecord } from '../src/schema/record.js';

let container;
let root;

beforeEach(() => {
  mockRecordsStore.items = [];
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

async function render(el) {
  await act(async () => {
    root.render(el);
  });
}

// ─── §9 Popup UI & Error Handling ────────────────────────────────────────────

describe('§9 Popup UI states', () => {
  it('renders idle state with Extract fields button and Dashboard link', async () => {
    await render(<Popup />);
    expect(container.textContent).toContain('Extract fields');
    expect(container.textContent).toContain('Dashboard');
  });

  it('shows clear error when popup is opened on unsupported/disconnected page', async () => {
    mockSendMessage.mockResolvedValueOnce({
      ok: false,
      error: 'Could not connect to the page. Make sure you are on a supported portal page.',
    });

    await render(<Popup />);
    const btn = [...container.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Extract fields')
    );

    await act(async () => {
      btn.click();
    });

    expect(container.textContent).toContain('Could not connect to the page');
    expect(container.textContent).toContain('Try again');
  });

  it('transitions to ReviewForm on successful extraction', async () => {
    mockSendMessage.mockResolvedValueOnce({
      ok: true,
      isPlaceholder: true,
      origin: 'https://portal.example.com',
      fields: {
        policyNumber: 'POL-UI-001',
        policyHolder: 'UI Test',
        effectiveDate: '01/01/2025',
      },
    });

    await render(<Popup />);
    const btn = [...container.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Extract fields')
    );

    await act(async () => {
      btn.click();
    });

    expect(container.textContent).toContain('Placeholder data');
    expect(container.querySelector('#field-policyNumber').value).toBe('POL-UI-001');
  });
});

// ─── §3 ReviewForm workflow & §9 Accessibility ───────────────────────────────

describe('§3 & §9 ReviewForm workflow and accessibility', () => {
  const sampleExtraction = {
    isPlaceholder: false,
    origin: 'https://portal.example.com',
    fields: {
      policyNumber: 'POL-RF-001',
      policyHolder: 'Jane Doe',
      effectiveDate: '01/01/2025',
      expiryDate: '',
      coverageAmount: '',
      premiumAmount: '',
      policyType: '',
      notes: '',
    },
  };

  it('associates every form input with a <label> via htmlFor/id', async () => {
    await render(
      <ReviewForm extraction={sampleExtraction} onSaved={vi.fn()} onDiscard={vi.fn()} />
    );
    const labels = container.querySelectorAll('label');
    expect(labels.length).toBeGreaterThanOrEqual(8);
    for (const label of labels) {
      const targetId = label.getAttribute('for');
      expect(targetId).toBeTruthy();
      expect(container.querySelector(`#${targetId}`)).not.toBeNull();
    }
  });

  it('marks required fields with aria-required="true"', async () => {
    await render(
      <ReviewForm extraction={sampleExtraction} onSaved={vi.fn()} onDiscard={vi.fn()} />
    );
    expect(container.querySelector('#field-policyNumber').getAttribute('aria-required')).toBe('true');
    expect(container.querySelector('#field-policyHolder').getAttribute('aria-required')).toBe('true');
    expect(container.querySelector('#field-effectiveDate').getAttribute('aria-required')).toBe('true');
  });

  it('calls onDiscard and does not save when Discard is clicked', async () => {
    const onSaved = vi.fn();
    const onDiscard = vi.fn();
    await render(
      <ReviewForm extraction={sampleExtraction} onSaved={onSaved} onDiscard={onDiscard} />
    );

    const discardBtn = [...container.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Discard')
    );
    await act(async () => {
      discardBtn.click();
    });

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(mockDb.records.add).not.toHaveBeenCalled();
  });

  it('shows validation error and blocks save when required field is cleared', async () => {
    const onSaved = vi.fn();
    const blankExtraction = {
      ...sampleExtraction,
      fields: { ...sampleExtraction.fields, policyNumber: '' },
    };

    await render(
      <ReviewForm extraction={blankExtraction} onSaved={onSaved} onDiscard={vi.fn()} />
    );

    const form = container.querySelector('form');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Required field "Policy Number" is missing or empty.');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('warns on duplicate policyNumber instead of overwriting', async () => {
    mockRecordsStore.items.push(
      createRecord({
        policyNumber: 'POL-RF-001',
        policyHolder: 'Existing Holder',
        effectiveDate: '01/01/2025',
      })
    );

    const onSaved = vi.fn();
    await render(
      <ReviewForm extraction={sampleExtraction} onSaved={onSaved} onDiscard={vi.fn()} />
    );

    const form = container.querySelector('form');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('already exists');
    expect(onSaved).not.toHaveBeenCalled();
    expect(mockDb.records.add).not.toHaveBeenCalled();
  });

  it('handles storage QuotaExceededError gracefully with user-friendly message', async () => {
    const err = new Error('Quota exceeded');
    err.name = 'QuotaExceededError';
    mockDb.records.add.mockRejectedValueOnce(err);

    const onSaved = vi.fn();
    await render(
      <ReviewForm extraction={sampleExtraction} onSaved={onSaved} onDiscard={vi.fn()} />
    );

    const form = container.querySelector('form');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Storage is full');
    expect(onSaved).not.toHaveBeenCalled();
  });
});

// ─── §9 Dashboard states & §3 Delete confirmation ────────────────────────────

describe('§9 & §3 Dashboard UI states', () => {
  it('shows clear empty dashboard state when no records exist', async () => {
    await render(<Dashboard />);
    expect(container.textContent).toContain('No records yet');
  });

  it('shows "No records match your search." when search has no results', async () => {
    mockRecordsStore.items.push(
      createRecord({
        policyNumber: 'DASH-001',
        policyHolder: 'Alpha User',
        effectiveDate: '01/01/2025',
      })
    );

    await render(<Dashboard />);
    expect(container.textContent).toContain('DASH-001');

    const searchInput = container.querySelector('input[type="search"]');
    await act(async () => {
      // Simulate React controlled input change
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      ).set;
      nativeSetter.call(searchInput, 'NONEXISTENT-XYZ');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(container.textContent).toContain('No records match your search.');
  });

  it('requires confirmation before deleting a record and handles cancellation', async () => {
    mockRecordsStore.items.push(
      createRecord({
        policyNumber: 'DEL-001',
        policyHolder: 'Delete Test',
        effectiveDate: '01/01/2025',
      })
    );

    await render(<Dashboard />);
    const deleteBtn = [...container.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === 'Delete'
    );

    await act(async () => {
      deleteBtn.click();
    });

    // Confirmation modal should appear with role="dialog"
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Confirm deletion');

    // Click Cancel
    const cancelBtn = [...dialog.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Cancel')
    );
    await act(async () => {
      cancelBtn.click();
    });

    expect(mockDb.records.delete).not.toHaveBeenCalled();
    expect(mockRecordsStore.items).toHaveLength(1);
  });
});
