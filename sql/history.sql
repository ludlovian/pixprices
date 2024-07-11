----------------------------------------------------------------
-- Holds the schema number
--
CREATE TABLE IF NOT EXISTS _Schema (
  id INTEGER PRIMARY KEY NOT NULL check (id = 0),
  version INTEGER NOT NULL
);
INSERT OR REPLACE INTO _Schema VALUES(0, 3);

----------------------------------------------------------------
--
-- Price
--

CREATE TABLE IF NOT EXISTS Price (
  ticker      TEXT NOT NULL,
  date        TEXT NOT NULL,
  price       NUMBER,
  PRIMARY KEY (ticker, date)
) WITHOUT ROWID;


