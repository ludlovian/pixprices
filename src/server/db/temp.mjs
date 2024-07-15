export default `
----------------------------------------------------------------
--
-- The temp database schema
--
-- This contains all the temp tables, views & triggers to
-- update the real database with a table-at-a-time approach

BEGIN TRANSACTION;

----------------------------------------------------------------
--
-- addPrice
--
-- adds or inserts a new price into the database, so long as
-- it was not too recent and that something has changed
--
--  - ticker
--  - price
--  - name
--  - source
--  - recent - given as the number of ms grace
--             converted to fractions of a day by dividing
--             by 86_400_400 - the number of ms in a day
--
----------------------------------------------------------------

CREATE TEMP VIEW addPrice
  (ticker, price, name, source, recent)
  AS SELECT 0, 0, 0, 0, 0 WHERE 0;
CREATE TEMP TRIGGER addPrice_sproc INSTEAD OF INSERT ON addPrice
BEGIN

  INSERT INTO Price(ticker, price, name, source, updated)
    VALUES (new.ticker, new.price, new.name, new.source, julianday())

    ON CONFLICT(ticker) DO UPDATE

      SET   (price, name, source) =
              (new.price, new.name, new.source),
            updated = julianday()
      WHERE (price, name, source) IS NOT (new.price, new.name, new.source)
        AND updated < julianday() - ifnull(new.recent / 86_400_400, 0);

END;

----------------------------------------------------------------
--
-- prunePrice
--
-- clears out old prices
--
-- The period is given in ms, so we convert to Julian
--
----------------------------------------------------------------

CREATE TEMP VIEW prunePrice (period) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER prunePrice_sproc INSTEAD OF INSERT ON prunePrice
BEGIN

  DELETE FROM Price
    WHERE updated < julianday() - new.period / 86_400_000;

END;

----------------------------------------------------------------
--
-- addDividend
--
-- adds a dividend into the database, or updates one
-- if something has changed
--
----------------------------------------------------------------

CREATE TEMP VIEW addDividend
  (ticker, date, dividend, currency, exdiv, declared, source) AS
  SELECT 0, 0, 0, 0, 0, 0, 0 WHERE 0;
CREATE TEMP TRIGGER addDividend_sproc INSTEAD OF INSERT ON addDividend
BEGIN

  INSERT INTO Dividend
    (
      ticker,
      date,
      dividend,
      currency,
      exdiv,
      declared,
      source,
      updated
    )
    VALUES
      (
        new.ticker,
        new.date,
        new.dividend,
        new.currency,
        new.exdiv,
        new.declared,
        new.source,
        julianday()
      )

    ON CONFLICT(ticker, date) DO UPDATE

      SET (dividend, currency, exdiv, declared, source) = 
            (excluded.dividend, excluded.currency, excluded.exdiv, excluded.declared, excluded.source),
          updated = excluded.updated
      WHERE (dividend, currency, exdiv, declared, source) IS NOT
            (excluded.dividend, excluded.currency, excluded.exdiv, excluded.declared, excluded.source);

END;

----------------------------------------------------------------
--
-- Positions
--
-- Three procedures - start, add & end
-- and a temporary table
--

--
-- Create a temporary table of the previous keys
--

CREATE TEMP TABLE oldPositions
  (ticker, account, who,
    PRIMARY KEY(ticker, account, who));

CREATE TEMP VIEW startPositions (unused) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER startPositions_sproc INSTEAD OF INSERT ON startPositions
BEGIN

  DELETE FROM oldPositions;
  INSERT INTO oldPositions
    SELECT ticker, account, who
    FROM Position;
END;

--
-- Add/update a position, and remove from the temporary table
--

CREATE TEMP VIEW addPosition
  (ticker, account, who, qty) AS
  SELECT 0, 0, 0, 0 WHERE 0;
CREATE TEMP TRIGGER addPosition_sproc INSTEAD OF INSERT ON addPosition
BEGIN

  INSERT INTO Position (ticker, account, who, qty, updated)
    VALUES (new.ticker, new.account, new.who, new.qty, julianday())

    ON CONFLICT (ticker, account, who) DO UPDATE

      SET qty = excluded.qty,
          updated = excluded.updated

      WHERE qty IS NOT excluded.qty;

  DELETE FROM oldPositions
    WHERE (ticker, account, who) IS
      (new.ticker, new.account, new.who);

END;

--
-- Remove any old positions and clear the temp table
--

CREATE TEMP VIEW endPositions(unused) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER endPositions_sproc INSTEAD OF INSERT ON endPositions
BEGIN

  DELETE FROM Position
    WHERE (ticker, account, who) IN (
      SELECT ticker, account, who
        FROM oldPositions
    );

  DELETE FROM oldPositions;

END;

----------------------------------------------------------------
--
-- Metrics
--
-- Three procedures - start, add & end
-- and a temporary table
--

--
-- Create a temporary table of the previous keys
--

CREATE TEMP TABLE oldMetrics (ticker PRIMARY KEY);

CREATE TEMP VIEW startMetrics (unused) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER startMetrics_sproc INSTEAD OF INSERT ON startMetrics
BEGIN

  DELETE FROM oldMetrics;
  INSERT INTO oldMetrics
    SELECT ticker
    FROM Metric;
END;

--
-- Add/update a position, and remove from the temporary table
--

CREATE TEMP VIEW addMetric
  (ticker, dividend, nav, eps) AS
  SELECT 0, 0, 0, 0 WHERE 0;
CREATE TEMP TRIGGER addMetric_sproc INSTEAD OF INSERT ON addMetric
BEGIN

  INSERT INTO Metric (ticker, dividend, nav, eps, updated)
    VALUES (new.ticker, new.dividend, new.nav, new.eps, julianday())

    ON CONFLICT (ticker) DO UPDATE

      SET (dividend, nav, eps) =
            (excluded.dividend, excluded.nav, excluded.eps),
          updated = excluded.updated

      WHERE (dividend, nav, eps) IS NOT
              (excluded.dividend, excluded.nav, excluded.eps);

  DELETE FROM oldMetrics
    WHERE ticker = new.ticker;

END;

--
-- Remove any old metrics and clear the temp table
--

CREATE TEMP VIEW endMetrics(unused) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER endMetrics_sproc INSTEAD OF INSERT ON endMetrics
BEGIN

  DELETE FROM Metric
    WHERE ticker IN (
      SELECT ticker
        FROM oldMetrics
    );

  DELETE FROM oldMetrics;

END;

----------------------------------------------------------------
--
-- Trades
--
-- Three procedures - start, add & end
-- and a temporary table
--

--
-- Create a temporary table of the previous keys
--

CREATE TEMP TABLE oldTrades (tradeId PRIMARY KEY);

CREATE TEMP VIEW startTrades (unused) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER startTrades_sproc INSTEAD OF INSERT ON startTrades
BEGIN

  DELETE FROM oldTrades;
  INSERT INTO oldTrades
    SELECT tradeId
    FROM Trade;
END;

--
-- Add/update a position, and remove from the temporary table
--

CREATE TEMP VIEW addTrade
  (tradeId, ticker, account, who, date, qty, cost, gain, proceeds, notes) AS
  SELECT 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 WHERE 0;
CREATE TEMP TRIGGER addTrade_sproc INSTEAD OF INSERT ON addTrade
BEGIN

  -- Add the new trade, converting date from Sheets serial to
  -- Julian date
  --
  -- Amounts are also stored as rounded pennies

  INSERT INTO Trade
    (
      tradeId,
      ticker,
      account,
      who,
      date,
      qty,
      cost,
      gain,
      proceeds,
      notes,
      updated
    )

    VALUES
      (
        new.tradeId,
        new.ticker,
        new.account,
        new.who,
        date(ROUND(new.date) + julianday('1899-12-30 00:00:00')),
        new.qty,
        CAST(100.0 * new.cost AS INTEGER),
        CAST(100.0 * new.gain AS INTEGER),
        CAST(100.0 * new.proceeds AS INTEGER),
        new.notes,
        julianday()
      )

    -- upsert the row if anything changed

    ON CONFLICT (tradeId) DO UPDATE

      SET
        (ticker, account, who, date,
            qty, cost, gain, proceeds, notes) =
          (excluded.ticker, excluded.account, excluded.who,
            excluded.date, excluded.qty, excluded.cost, excluded.gain,
            excluded.proceeds, excluded.notes),
        updated = excluded.updated

      WHERE
        (ticker, account, who, date,
            qty, cost, gain, proceeds, notes) IS NOT
          (excluded.ticker, excluded.account, excluded.who,
            excluded.date, excluded.qty, excluded.cost, excluded.gain,
            excluded.proceeds, excluded.notes);

  -- mark this trade as used

  DELETE FROM oldTrades
    WHERE tradeId = new.tradeId;

END;

--
-- Remove any old trades and clear the temp table
--

CREATE TEMP VIEW endTrades(unused) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER endTrades_sproc INSTEAD OF INSERT ON endTrades
BEGIN

  DELETE FROM Trade
    WHERE tradeId IN (
      SELECT tradeId
        FROM oldTrades
    );

  DELETE FROM oldTrades;

END;


----------------------------------------------------------------
--
-- Stocks
--
-- Three procedures - start, add & end
-- and a temporary table
--

--
-- Create a temporary table of the previous keys
--

CREATE TEMP TABLE oldStocks (ticker PRIMARY KEY);

CREATE TEMP VIEW startStocks (unused) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER startStocks_sproc INSTEAD OF INSERT ON startStocks
BEGIN

  DELETE FROM oldStocks;
  INSERT INTO oldStocks
    SELECT ticker
    FROM Stock;
END;

--
-- Add/update a position, and remove from the temporary table
--

CREATE TEMP VIEW addStock
  (ticker, name, incomeType, notes, currency, priceFactor) AS
  SELECT 0, 0, 0, 0, 0 ,0 WHERE 0;
CREATE TEMP TRIGGER addStock_sproc INSTEAD OF INSERT ON addStock
BEGIN

  INSERT INTO Stock
    (
      ticker,
      name,
      incomeType,
      notes,
      currency,
      priceFactor,
      updated
    )
    VALUES
    (
      new.ticker,
      new.name,
      new.incomeType,
      new.notes,
      new.currency,
      new.priceFactor,
      julianday()
    )

    ON CONFLICT (ticker) DO UPDATE

      SET
        (name, incomeType, notes, currency, priceFactor) =
          (excluded.name, excluded.incomeType, excluded.notes, excluded.currency, excluded.priceFactor),
        updated = excluded.updated

      WHERE
        (name, incomeType, notes, currency, priceFactor) IS NOT
          (excluded.name, excluded.incomeType, excluded.notes, excluded.currency, excluded.priceFactor);

  DELETE FROM oldStocks
    WHERE ticker = new.ticker;

END;

--
-- Add in any missing ones, Remove any old stocks and clear the temp table
--

CREATE TEMP VIEW endStocks(unused) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER endStocks_sproc INSTEAD OF INSERT ON endStocks
BEGIN

  INSERT INTO Stock
    (
      ticker,
      name,
      incomeType,
      notes,
      currency,
      priceFactor,
      updated
    )
    WITH cteUsedTickers AS
      (
        SELECT ticker FROM Position
        UNION
        SELECT ticker FROM Trade
        UNION
        SELECT ticker FROM Metric
      )
    SELECT
      a.ticker,
      ifnull(b.name || ' (PIXIE!)', 'Unknown (PIXIE!)'),
      null,
      'Automagically added',
      'GBP',
      100,
      julianday()

    FROM
      cteUsedTickers a
      LEFT JOIN Price b ON b.ticker = a.ticker
      WHERE a.ticker NOT IN (
        SELECT ticker FROM Stock
      );

  DELETE FROM Stock
    WHERE ticker IN (
      SELECT ticker
        FROM oldStocks
    );

  DELETE FROM oldStocks;

END;



----------------------------------------------------------------

COMMIT;

-- vim: ft=sql ts=2:sts=2:sw=2:et
`
