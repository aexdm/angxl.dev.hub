-- schema.sql
-- SQLite Schema compatible with Cloudflare D1
-- Create tables for users, sessions, and guestbook entries

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,          -- Discord user id (snowflake)
  username     TEXT NOT NULL,             -- Discord username
  global_name  TEXT,                      -- display name (may be null)
  avatar_url   TEXT,                      -- resolved CDN avatar url
  is_admin     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  last_login   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,           -- random opaque token
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guestbook (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL,              -- snapshot at post time
  avatar_url  TEXT,                       -- snapshot at post time
  message     TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gb_created ON guestbook (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
