----------------------------------------------------------------
-- Audit database for investments
----------------------------------------------------------------

BEGIN TRANSACTION;

----------------------------------------------------------------
-- Holds the schema number
--
-- UPDATE BOTH LINES WHEN SCHEMA CHANGES
--
CREATE TABLE IF NOT EXISTS audit._Schema (
  id INTEGER PRIMARY KEY CHECK (id = 0),
  version INTEGER NOT NULL);
INSERT OR IGNORE INTO audit._Schema VALUES (0, 1);
CREATE VIEW IF NOT EXISTS audit._vSchema (valid) AS
  SELECT version = 1 FROM  _Schema;

----------------------------------------------------------------
-- Stock

CREATE TABLE IF NOT EXISTS audit.Stock(
  ticker      TEXT NOT NULL,
  name        TEXT,
  incomeType  TEXT,
  notes       TEXT,
  currency    TEXT,
  priceFactor INTEGER,
  updated     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit.Stock_ix_1
  ON Stock (ticker);

----------------------------------------------------------------
-- Price

CREATE TABLE IF NOT EXISTS audit.Price(
  ticker    TEXT NOT NULL,
  name      TEXT,
  price     NUMBER,
  source    TEXT,
  updated   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit.Price_ix_1
  ON Price (ticker);

----------------------------------------------------------------
-- Metric

CREATE TABLE IF NOT EXISTS audit.Metric(
  ticker    TEXT NOT NULL,
  dividend  NUMBER,
  nav       NUMBER,
  eps       NUMBER,
  updated   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit.Metric_ix_1
  ON Metric (ticker);

----------------------------------------------------------------
-- Dividend

CREATE TABLE IF NOT EXISTS audit.Dividend(
  date      TEXT NOT NULL,
  ticker    TEXT NOT NULL,
  dividend  NUMBER,
  currency  TEXT,
  exdiv     TEXT,
  declared  TEXT,
  source    TEXT,
  updated   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit.Dividend_ix_1
  ON Dividend (ticker, date);

----------------------------------------------------------------
-- Position

CREATE TABLE IF NOT EXISTS audit.Position(
  ticker      TEXT NOT NULL,
  account     TEXT NOT NULL,
  who         TEXT NOT NULL,
  qty         INTEGER,
  updated     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit.Position_ix_1
  ON Position (ticker, account, who);

----------------------------------------------------------------
-- Trade

CREATE TABLE IF NOT EXISTS audit.Trade(
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

CREATE INDEX IF NOT EXISTS audit.Trade_ix_1
  ON Trade (ticker, account, who, date, seq);

----------------------------------------------------------------
COMMIT;
VACUUM audit;

-- vim: ts=2:sts=2:sw=2:et
