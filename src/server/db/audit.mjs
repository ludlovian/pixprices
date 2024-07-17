export default `
----------------------------------------------------------------
-- Holds the schema number
--
--
CREATE TABLE IF NOT EXISTS schema (
  id INTEGER PRIMARY KEY NOT NULL check (id = 1),
  version INTEGER NOT NULL
);
INSERT OR IGNORE INTO schema VALUES(1, 4);

----------------------------------------------------------------
-- Audit table for portfolio database
----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS Changes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tableName   TEXT NOT NULL,
  beforeData  TEXT,
  afterData   TEXT,
  timestamp   REAL NOT NULL,
  utcUpdated  TEXT GENERATED ALWAYS AS (datetime(timestamp))
);
-- vim: ft=sql ts=2:sts=2:sw=2:et
`
