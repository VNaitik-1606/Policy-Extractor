/**
 * db.js
 *
 * Dexie (IndexedDB) instance with schema migrations.
 * Always bump the version number when changing the stores schema.
 */

import Dexie from 'dexie';

const db = new Dexie('PolicyExtractorDB');

// ── Schema versions ──────────────────────────────────────────────────────────
// Version 1: initial schema
db.version(1).stores({
  /**
   * records table
   * ++  = auto-increment primary key (not used; we supply our own uuid as 'id')
   * id  = our UUID (indexed)
   * createdAt, policyNumber = additional indexes for sorting / searching
   *
   * Dexie compound indexes use comma-separated names inside brackets.
   */
  records: 'id, createdAt, updatedAt, [fields.policyNumber]',
});

// Add future versions here, e.g.:
// db.version(2).stores({ ... }).upgrade(tx => { ... });

export default db;
