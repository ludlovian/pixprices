export default `
----------------------------------------------------------------
-- Investments databse
----------------------------------------------------------------

PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

-- Portfolio database
--
-- Not fully normalised - esp ticker / account / who - where we use codes
-- Monetary values are stored as integers scaled by 100
-- Calendar dates are julian days at noon (integers)
-- Timestamps are julian days (reals)

----------------------------------------------------------------
-- Holds the schema number
--
--
CREATE TABLE IF NOT EXISTS schema (
  id INTEGER PRIMARY KEY NOT NULL check (id = 1),
  version INTEGER NOT NULL
);
INSERT OR REPLACE INTO schema VALUES(1, 2);


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
  updated     REAL NOT NULL
);

----------------------------------------------------------------
-- Price
--
-- Holds a price for a stock
--

CREATE TABLE IF NOT EXISTS Price (
  ticker      TEXT PRIMARY KEY NOT NULL,
  price       REAL,
  name        TEXT,
  source      TEXT,
  updated     REAL NOT NULL
);

----------------------------------------------------------------
-- Metric
--
-- Holds valuation metrics for a stock
--

CREATE TABLE IF NOT EXISTS Metric (
  ticker      TEXT PRIMARY KEY NOT NULL,
  dividend    REAL,
  nav         REAL,
  eps         REAL,
  updated     REAL NOT NULL
);

----------------------------------------------------------------
-- Dividend
--
-- Holds a dividend payment for a stock
--

CREATE TABLE IF NOT EXISTS Dividend (
  ticker      TEXT NOT NULL,
  date        TEXT NOT NULL,
  dividend    REAL NOT NULL,
  currency    TEXT,
  exdiv       TEXT NOT NULL,
  declared    TEXT NOT NULL,
  source      TEXT,
  updated     REAL NOT NULL,
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
  updated     REAL NOT NULL,
  PRIMARY KEY (ticker, account, who)
);

----------------------------------------------------------------
-- Trade
--
-- Holds the details of a trade
--

CREATE TABLE IF NOT EXISTS Trade (
  tradeId     INTEGER PRIMARY KEY NOT NULL,
  ticker      TEXT NOT NULL,
  account     TEXT NOT NULL,
  who         TEXT NOT NULL,
  date        TEXT NOT NULL,
  qty         INTEGER,
  cost        INTEGER,
  gain        INTEGER,
  proceeds    INTEGER,
  notes       TEXT,
  updated     REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS Trade_ix_1 ON Trade(ticker, account, who, date);

----------------------------------------------------------------
--
-- Views
--
----------------------------------------------------------------

----------------------------------------------------------------
--
-- Export Views
--
----------------------------------------------------------------

--
-- vStock
--

CREATE VIEW IF NOT EXISTS vStock AS
  SELECT
    a.ticker,
    a.incomeType,
    a.name,
    b.price / a.priceFactor as price,
    c.dividend,
    julianday(b.updated, 'localtime') -
      julianday('1899-12-30 00:00:00') AS updated

  FROM
    Stock a
    LEFT JOIN Price b ON b.ticker = a.ticker
    LEFT JOIN Metric c ON c.ticker = a.ticker

  ORDER BY a.ticker;

--
-- vStock
--

CREATE VIEW IF NOT EXISTS vPosition AS
  WITH cteCost AS
  (
    SELECT
      ticker,
      account,
      who,
      round(sum(cost) / 100.0, 2) as cost

    FROM Trade
    GROUP BY ticker, account, who
  ),
  ctePrice AS
  (
    SELECT
      a.ticker,
      b.price / a.priceFactor as price

    FROM
      Stock a
      LEFT JOIN Price b ON b.ticker = a.ticker
  )
  SELECT
    a.ticker || ':' || a.account || ':' || a.who AS code,
    a.ticker,
    a.account,
    a.who,
    a.qty,
    b.price,
    c.dividend,
    round(a.qty * b.price, 2) AS value,
    round(a.qty * c.dividend, 2) AS income,
    c.dividend / b.price as yield,
    d.cost AS cost,
    round(a.qty * b.price - d.cost, 2) as gain
  FROM
    Position a
    LEFT JOIN ctePrice b ON b.ticker = a.ticker
    LEFT JOIN Metric c ON c.ticker = a.ticker
    LEFT JOIN cteCost d ON
      (d.ticker, d.account, d.who) = (a.ticker, a.account, a.who)

  ORDER BY a.ticker, a.account, a.who;

--
-- vDividend
--

CREATE VIEW IF NOT EXISTS vDividend AS
  SELECT
    julianday(b.date) -
      julianday('1899-12-30') AS date,
    a.ticker,
    a.account,
    a.who,
    round(a.qty * b.dividend, 2) as dividend,
    julianday(b.date, 'start of month') -
      julianday('1899-12-30') AS month

  FROM
    Position a
    JOIN Dividend b ON b.ticker = a.ticker

  WHERE
    b.date >= date('now', 'start of month')

  ORDER BY b.date, a.ticker;


----------------------------------------------------------------
-- viewStock
--
-- Useful data about a stock
--
-- Only includes stocks where we have
--  - positions
--  - trades
--  - metrics
--  - stocks with a priceFactor

CREATE VIEW IF NOT EXISTS viewStock AS
  WITH cteStock AS (
    SELECT ticker FROM Stock WHERE priceFactor IS NOT NULL
    UNION
    SELECT ticker FROM Position WHERE qty > 0
    UNION
    SELECT ticker FROM Trade
    UNION
    SELECT ticker FROM Metric
  )
  SELECT  a.ticker,
          a.name,
          a.incomeType,
          a.notes,
          100.0 * c.price / a.priceFactor AS price,
          100.0 * d.dividend AS dividend,
          d.dividend * a.priceFactor / c.price AS yield
  FROM       Stock    a
  JOIN       cteStock b ON b.ticker = a.ticker
  LEFT JOIN  Price    c ON c.ticker = a.ticker
  LEFT JOIN  Metric   d ON d.ticker = a.ticker
  ORDER BY a.ticker;

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
    SELECT ticker, account, who, SUM(cost) AS cost
    FROM Trade
    GROUP BY ticker, account, who
  )
  SELECT
    a.ticker,
    a.account,
    a.who,
    a.qty,
    b.price,
    b.dividend,
    CAST(a.qty * b.price AS INTEGER) AS value,
    CAST(a.qty * b.dividend AS INTEGER) AS income,
    b.yield,
    c.cost,
    CAST(a.qty * b.price - c.cost AS INTEGER) AS gain
  FROM      Position  a
  LEFT JOIN viewStock b ON b.ticker = a.ticker
  LEFT JOIN cteCost   c ON (c.ticker, c.account, c.who) =
                           (a.ticker, a.account, a.who)
  ORDER BY a.ticker, a.account, a.who;

----------------------------------------------------------------
-- viewDividend
--
-- All monetary values are in pennies
--
----------------------------------------------------------------

CREATE VIEW IF NOT EXISTS viewDividend AS
  SELECT
    b.date,
    a.ticker,
    a.account,
    a.who,
    CAST(100 * a.qty * b.dividend AS INTEGER) AS dividend
  FROM Position a
  JOIN Dividend b USING (ticker)
  ORDER BY date, ticker;

----------------------------------------------------------------
-- viewError
--

CREATE VIEW IF NOT EXISTS viewError (code, message) AS
  WITH
  cteTradePos AS (
    SELECT ticker, account, who, sum(qty) as pos
      FROM Trade
      GROUP BY ticker, account, who
      HAVING pos != 0
  ),
  cteCurrentStock AS (
    SELECT ticker FROM Position
      UNION
    SELECT ticker from Trade
      UNION
    SELECT ticker from Metric
  )
  SELECT a.ticker,
         'Stock traded but no static details held'
    FROM Trade a
    JOIN Stock b USING (ticker)
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
  WHERE b.updated < julianday('now','-1 week')
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
-- vim: ft=sql ts=2:sts=2:sw=2:et
`
