----------------------------------------------------------------
-- Investments databse
----------------------------------------------------------------

PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

-- The database is updated a table at a time when the underlying
-- sheet is written back.
--
-- We have a separate temp table for each table in the schema
-- which is filled and then any changes copied across to the main
-- table
--
-- Monetary values are then stored as integers scaled by 100
--

----------------------------------------------------------------
-- Holds the schema number
--
--
CREATE TABLE IF NOT EXISTS _Schema (
  id INTEGER PRIMARY KEY NOT NULL check (id = 0),
  version INTEGER NOT NULL
);
INSERT OR REPLACE INTO _Schema VALUES(0, 3);

----------------------------------------------------------------
--
-- The permanent database

----------------------------------------------------------------
-- Stock
--
-- Holds a record for a stock
--

CREATE TABLE IF NOT EXISTS Stock (
  ticker      TEXT NOT NULL PRIMARY KEY,
  name        TEXT,
  incomeType  TEXT,
  notes       TEXT,
  currency    TEXT,
  priceFactor INTEGER,
  updated     TEXT NOT NULL
);

----------------------------------------------------------------
-- Price
--
-- Holds a price for a stock
--

CREATE TABLE IF NOT EXISTS Price (
  ticker      TEXT NOT NULL PRIMARY KEY,
  name        TEXT,
  price       NUMBER,
  source      TEXT,
  updated     TEXT NOT NULL
);

----------------------------------------------------------------
-- Metric
--
-- Holds valuation metrics for a stock
--

CREATE TABLE IF NOT EXISTS Metric (
  ticker      TEXT NOT NULL PRIMARY KEY,
  dividend    NUMBER,
  nav         NUMBER,
  eps         NUMBER,
  updated     TEXT NOT NULL
);

----------------------------------------------------------------
-- Dividend
--
-- Holds a dividend payment for a stock
--

CREATE TABLE IF NOT EXISTS Dividend (
  ticker      TEXT NOT NULL,
  date        TEXT NOT NULL,
  dividend    NUMBER NOT NULL,
  currency    TEXT,
  exdiv       TEXT,
  declared    TEXT,
  source      TEXT,
  updated     TEXT NOT NULL,
  PRIMARY KEY (ticker, date)
);
CREATE INDEX IF NOT EXISTS Dividend_ix_1 ON Dividend(date, ticker);

----------------------------------------------------------------
-- Position
--
-- Holds the position for a stock/account/person combination
--

CREATE TABLE IF NOT EXISTS Position (
  ticker      TEXT NOT NULL,
  account     TEXT NOT NULL,
  who         TEXT NOT NULL,
  qty         INTEGER NOT NULL,
  updated     TEXT NOT NULL,
  PRIMARY KEY (ticker, account, who)
);

----------------------------------------------------------------
-- Trade
--
-- Holds the details of a trade
--

CREATE TABLE IF NOT EXISTS Trade (
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
  updated     TEXT NOT NULL,
  PRIMARY KEY (ticker, account, who, date, seq)
);

----------------------------------------------------------------
--
-- Views
--
----------------------------------------------------------------

----------------------------------------------------------------
-- viewStock
--
-- Useful data about a stock

CREATE VIEW IF NOT EXISTS viewStock AS
  SELECT  a.ticker,
          a.name,
          a.incomeType,
          a.notes,
          100.0 * b.price / a.priceFactor AS price,
          100.0 * c.dividend AS dividend,
          c.dividend * a.priceFactor / b.price AS yield
  FROM  Stock a
  JOIN  Price b USING (ticker)
  LEFT JOIN  Metric c USING (ticker);

----------------------------------------------------------------
-- viewPosition
--
-- All values are in pennies
--  - prices and dps are floating
--  - actual cash amounts are rounded to integers
--
----------------------------------------------------------------

CREATE VIEW IF NOT EXISTS viewPosition AS
  WITH cteCost AS (
    SELECT ticker, account, who,
           SUM(cost) AS cost
    FROM Trade
    GROUP BY ticker, account, who
  )
  SELECT
    a.ticker, a.account, a.who,
    a.qty AS qty,
    b.price AS price,
    b.dividend AS dividend,
    CAST(a.qty * b.price AS INTEGER) AS value,
    CAST(a.qty * b.dividend AS INTEGER) AS income,
    b.yield,
    c.cost AS cost,
    CAST(a.qty * b.price - c.cost AS INTEGER) AS gain
  FROM Position a
  JOIN viewStock b USING (ticker)
  JOIN cteCost c USING (ticker, account, who);

----------------------------------------------------------------
-- viewDividend
--
-- All monetary values are in pennies
--
----------------------------------------------------------------

CREATE VIEW IF NOT EXISTS viewDividend AS
  SELECT
    a.date,
    b.ticker,
    b.account,
    b.who,
    CAST(100 * a.dividend * b.qty AS INTEGER) AS dividend
  FROM Dividend a
  JOIN Position b USING (ticker)
  ORDER BY date, ticker;

----------------------------------------------------------------
-- viewError
--

CREATE VIEW IF NOT EXISTS viewError (code, message) AS
  WITH
  cteTradePos AS (
    SELECT ticker, account, who,
           SUM(qty) AS pos
    FROM Trade
    GROUP BY ticker, account, who
    HAVING pos != 0
  ),
  cteCurrentStock AS (
    SELECT ticker FROM cteTradePos
    UNION
    SELECT ticker FROM Position
  )
  SELECT a.ticker,
         'Stock has been traded but no record in Stock'
  FROM Trade a
  LEFT JOIN Stock b USING (ticker)
  WHERE b.ticker IS NULL
UNION ALL
  SELECT a.ticker,
         'No price at all for stock'
  FROM cteCurrentStock a
  LEFT JOIN Price b USING (ticker)
  WHERE b.ticker IS NULL
UNION ALL
  SELECT a.ticker,
         'No recent price for stock'
  FROM cteCurrentStock a
  JOIN Price b USING (ticker)
  WHERE b.updated < date('now','-5 days')
UNION ALL
  SELECT a.ticker || ':' || a.account || ':' || a.who,
         'Position does not match trades'
  FROM Position a
  LEFT JOIN cteTradePos b USING (ticker, account, who)
  WHERE a.qty IS NOT b.pos
UNION ALL
  SELECT a.ticker || ':' || a.account || ':' || a.who,
         'Position does not match trades'
  FROM cteTradePos a
  LEFT JOIN Position b USING (ticker, account, who)
  WHERE b.qty IS NULL;

----------------------------------------------------------------

COMMIT;
VACUUM;
-- vim: ts=2:sts=2:sw=2:et
