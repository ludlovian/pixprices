export default `
----------------------------------------------------------------
-- Holds the schema number
--
--
CREATE TABLE IF NOT EXISTS schema (
  id INTEGER PRIMARY KEY NOT NULL check (id = 1),
  version INTEGER NOT NULL
);
INSERT OR REPLACE INTO schema VALUES(1, 1);

----------------------------------------------------------------
-- Audit table for portfolio database
----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS Changes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tableName   TEXT NOT NULL,
  beforeData  TEXT,
  afterData   TEXT,
  updated     REAL NOT NULL
);
-- vim: ft=sql ts=2:sts=2:sw=2:et
`
