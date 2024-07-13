export default `
----------------------------------------------------------------
-- Audit database for investments
----------------------------------------------------------------

BEGIN TRANSACTION;

----------------------------------------------------------------
-- Holds the schema number
--
-- UPDATE BOTH LINES WHEN SCHEMA CHANGES
--
CREATE TABLE IF NOT EXISTS _Schema (
  id INTEGER PRIMARY KEY CHECK (id = 0),
  version INTEGER NOT NULL);
INSERT OR REPLACE INTO _Schema VALUES (0, 2);

----------------------------------------------------------------
-- Stock

CREATE TABLE IF NOT EXISTS Stock(
  ticker      TEXT NOT NULL,
  name        TEXT,
  incomeType  TEXT,
  notes       TEXT,
  currency    TEXT,
  priceFactor INTEGER,
  updated     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS Stock_ix_1
  ON Stock (ticker);

----------------------------------------------------------------
-- Metric

CREATE TABLE IF NOT EXISTS Metric(
  ticker    TEXT NOT NULL,
  dividend  NUMBER,
  nav       NUMBER,
  eps       NUMBER,
  updated   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS Metric_ix_1
  ON Metric (ticker);

----------------------------------------------------------------
-- Dividend

CREATE TABLE IF NOT EXISTS Dividend(
  date      TEXT NOT NULL,
  ticker    TEXT NOT NULL,
  dividend  NUMBER,
  currency  TEXT,
  exdiv     TEXT,
  declared  TEXT,
  source    TEXT,
  updated   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS Dividend_ix_1
  ON Dividend (ticker, date);

----------------------------------------------------------------
-- Position

CREATE TABLE IF NOT EXISTS Position(
  ticker      TEXT NOT NULL,
  account     TEXT NOT NULL,
  who         TEXT NOT NULL,
  qty         INTEGER,
  updated     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS Position_ix_1
  ON Position (ticker, account, who);

----------------------------------------------------------------
-- Trade

CREATE TABLE IF NOT EXISTS Trade(
  ticker      TEXT NOT NULL,
  account     TEXT NOT NULL,
  who         TEXT NOT NULL,
  date        TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  qty         INTEGER,
  cost        INTEGER,
  gain        INTEGER,
  proceeds    INTEGER,
  notes       TEXT,
  updated     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS Trade_ix_1
  ON Trade (ticker, account, who, date, seq);

----------------------------------------------------------------
COMMIT;

-- vim: ft=sql ts=2:sts=2:sw=2:et
`
