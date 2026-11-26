/**
 * fieldDefs.js
 *
 * Configurable list of fields the extension will extract and store.
 * Each entry describes one field. Update this list when the portal
 * structure is confirmed — do NOT add real portal selectors here;
 * those belong in the extraction adapter.
 *
 * Field types: 'text' | 'date' | 'currency' | 'identifier'
 */
export const FIELD_DEFS = [
  {
    id: 'policyNumber',
    label: 'Policy Number',
    type: 'identifier',
    required: true,
    maxLength: 50,
    description: 'Unique policy reference number.',
  },
  {
    id: 'policyHolder',
    label: 'Policy Holder Name',
    type: 'text',
    required: true,
    maxLength: 150,
    description: 'Full name of the primary policy holder.',
  },
  {
    id: 'effectiveDate',
    label: 'Effective Date',
    type: 'date',
    required: true,
    maxLength: 30,
    description: 'Date the policy becomes active.',
  },
  {
    id: 'expiryDate',
    label: 'Expiry Date',
    type: 'date',
    required: false,
    maxLength: 30,
    description: 'Date the policy expires.',
  },
  {
    id: 'coverageAmount',
    label: 'Coverage Amount',
    type: 'currency',
    required: false,
    maxLength: 50,
    description: 'Total insured / coverage amount.',
  },
  {
    id: 'premiumAmount',
    label: 'Premium Amount',
    type: 'currency',
    required: false,
    maxLength: 50,
    description: 'Periodic premium due.',
  },
  {
    id: 'policyType',
    label: 'Policy Type',
    type: 'text',
    required: false,
    maxLength: 100,
    description: 'Category or type of policy.',
  },
  {
    id: 'notes',
    label: 'Notes',
    type: 'text',
    required: false,
    maxLength: 1000,
    description: 'Free-form notes added by the user.',
  },
];

/** Lookup map: fieldId → definition */
export const FIELD_MAP = Object.fromEntries(FIELD_DEFS.map((f) => [f.id, f]));

/** IDs of required fields */
export const REQUIRED_FIELD_IDS = FIELD_DEFS.filter((f) => f.required).map((f) => f.id);
