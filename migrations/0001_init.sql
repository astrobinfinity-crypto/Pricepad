-- Migration number: 0001 	 2026-11-14T10:30:49.621Z
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT NOT NULL UNIQUE,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE price_lists (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  columns_json TEXT NOT NULL,
  pin_hash TEXT,
  is_public INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_lists_owner ON price_lists(owner_id);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_items_list ON items(list_id, position);