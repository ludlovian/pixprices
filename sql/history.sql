----------------------------------------------------------------
-- Holds the schema number
--
-- UPDATE BOTH LINES WHEN SCHEMA CHANGES
--
CREATE TABLE IF NOT EXISTS _Schema (
  id INTEGER PRIMARY KEY NOT NULL check (id = 0),
  version INTEGER NOT NULL
);
INSERT OR IGNORE INTO _Schema VALUES(0, 2);
CREATE VIEW IF NOT EXISTS _vSchema (valid) AS
  SELECT version = 2 FROM  _Schema;

----------------------------------------------------------------
--
-- Price
--

CREATE TABLE IF NOT EXISTS Price (
  ticker      TEXT NOT NULL,
  date        TEXT NOT NULL,
  price       NUMBER,
  PRIMARY KEY (ticker, date)
);


