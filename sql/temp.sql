----------------------------------------------------------------
--
-- The temp database schema
--
-- This contains all the temp tables, views & triggers to
-- update the real database with a table-at-a-time approach

BEGIN TRANSACTION;

----------------------------------------------------------------
--
-- Stock
--
----------------------------------------------------------------
--
-- The input table
--

CREATE TEMP TABLE temp_Stock(
  ticker      TEXT NOT NULL PRIMARY KEY,
  name        TEXT,
  incomeType  TEXT,
  notes       TEXT,
  currency    TEXT,
  priceFactor INTEGER
);

----------------------------------------------------------------
--
-- The views to identify changes
--

CREATE TEMP VIEW viewNewStock
  (ticker, name, incomeType, notes, currency, priceFactor, updated) AS
  SELECT a.ticker, a.name, a.incomeType, a.notes, a.currency, a.priceFactor, datetime('now')
  FROM temp_Stock a
  LEFT JOIN Stock b USING (ticker)
  WHERE
    b.ticker IS NULL OR
    (a.name, a.incomeType, a.notes, a.currency, a.priceFactor) IS NOT
    (b.name, b.incomeType, b.notes, b.currency, b.priceFactor);

CREATE TEMP VIEW viewOldStock
  (ticker, name, incomeType, notes, currency, priceFactor, updated) AS
  SELECT ticker, NULL, NULL, NULL, NULL, NULL, datetime('now')
  FROM Stock
  WHERE ticker NOT IN (
    SELECT ticker FROM temp_Stock
  );

CREATE TEMP VIEW auditStock
  (ticker, name, incomeType, notes, currency, priceFactor, updated) AS
  SELECT * FROM viewNewStock UNION ALL SELECT * FROM viewOldStock;

----------------------------------------------------------------
--
-- The stored proc to update the real table from the temp one
--

CREATE TEMP VIEW saveStock(unused) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER saveStock_t
  INSTEAD OF INSERT ON saveStock
BEGIN
  INSERT INTO Stock SELECT * FROM viewNewStock WHERE true
    ON CONFLICT(ticker) DO UPDATE
      SET
        (name, incomeType, notes, currency, priceFactor) =
          (EXCLUDED.name, EXCLUDED.incomeType, EXCLUDED.notes, EXCLUDED.currency, EXCLUDED.priceFactor),
        updated = EXCLUDED.updated
      WHERE
        (name, incomeType, notes, currency, priceFactor) IS NOT
          (EXCLUDED.name, EXCLUDED.incomeType, EXCLUDED.notes, EXCLUDED.currency, EXCLUDED.priceFactor);

  DELETE FROM Stock
    WHERE ticker IN (SELECT ticker FROM viewOldStock);

  DELETE FROM temp_Stock;
END;

----------------------------------------------------------------
--
-- Price
--
----------------------------------------------------------------
--
-- The input table
--

CREATE TEMP TABLE temp_Price(
  ticker      TEXT NOT NULL PRIMARY KEY,
  name        TEXT,
  price       NUMBER,
  source      TEXT
);

----------------------------------------------------------------
--
-- The views to identify changes
--

CREATE TEMP VIEW viewNewPrice
  (ticker, name, price, source, updated) AS
  SELECT a.ticker, a.name, a.price, a.source, datetime('now')
  FROM temp_Price a
  LEFT JOIN Price b USING (ticker)
  WHERE
    b.ticker IS NULL OR
    (a.name, a.price, a.source) IS NOT
    (b.name, b.price, b.source);

CREATE TEMP VIEW viewOldPrice
  (ticker, name, price, source, updated) AS
  SELECT ticker, NULL, NULL, NULL, datetime('now')
  FROM Price
  WHERE ticker NOT IN (
    SELECT ticker FROM temp_Price
  );

----------------------------------------------------------------
--
-- The stored proc to update the real table from the temp one
--

CREATE TEMP VIEW savePrice(unused) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER savePrice_t
  INSTEAD OF INSERT ON savePrice
BEGIN
  INSERT INTO Price SELECT * FROM viewNewPrice WHERE true
    ON CONFLICT(ticker) DO UPDATE
      SET
        (name, price, source) =
          (EXCLUDED.name, EXCLUDED.price, EXCLUDED.source),
        updated = EXCLUDED.updated
      WHERE
        (name, price, source) IS NOT
          (EXCLUDED.name, EXCLUDED.price, EXCLUDED.source);

  DELETE FROM Price
    WHERE ticker IN (SELECT ticker FROM viewOldPrice);

  DELETE FROM temp_Price;
END;

----------------------------------------------------------------
--
-- Metric
--
----------------------------------------------------------------
--
-- The input table
--

CREATE TEMP TABLE temp_Metric(
  ticker      TEXT NOT NULL PRIMARY KEY,
  dividend    NUMBER,
  nav         NUMBER,
  eps         NUMBER
);

----------------------------------------------------------------
--
-- The views to identify changes
--

CREATE TEMP VIEW viewNewMetric
  (ticker, dividend, nav, eps, updated) AS
  SELECT a.ticker, a.dividend, a.nav, a.eps, datetime('now')
  FROM temp_Metric a
  LEFT JOIN Metric b USING (ticker)
  WHERE
    b.ticker IS NULL OR
    (a.dividend, a.nav, a.eps) IS NOT
    (b.dividend, b.nav, b.eps);

CREATE TEMP VIEW viewOldMetric
  (ticker, dividend, nav, eps, updated) AS
  SELECT ticker, NULL, NULL, NULL, datetime('now')
  FROM Metric
  WHERE ticker NOT IN (
    SELECT ticker FROM temp_Metric
  );

CREATE TEMP VIEW auditMetric
  (ticker, dividend, nav, eps, updated) AS
  SELECT * from viewNewMetric UNION ALL SELECT * FROM viewOldMetric;

----------------------------------------------------------------
--
-- The stored proc to update the real table from the temp one
--

CREATE TEMP VIEW saveMetric(unused) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER saveMetric_t
  INSTEAD OF INSERT ON saveMetric
BEGIN
  INSERT INTO Metric SELECT * FROM viewNewMetric WHERE true
    ON CONFLICT (ticker) DO UPDATE
      SET
        (dividend, nav, eps) =
          (EXCLUDED.dividend, EXCLUDED.nav, EXCLUDED.eps),
        updated = EXCLUDED.updated
      WHERE
        (dividend, nav, eps) IS NOT
          (EXCLUDED.dividend, EXCLUDED.nav, EXCLUDED.eps);

  DELETE FROM Metric
    WHERE ticker IN (SELECT ticker FROM viewOldMetric);

  DELETE FROM temp_Metric;
END;

----------------------------------------------------------------
--
-- Dividend
--
----------------------------------------------------------------
--
-- The input table
--

CREATE TEMP TABLE temp_Dividend(
  ticker      TEXT NOT NULL,
  date        TEXT NOT NULL,
  dividend    NUMBER NOT NULL,
  currency    TEXT,
  exdiv       TEXT,
  declared    TEXT,
  source      TEXT,
  PRIMARY KEY (ticker, date)
);

----------------------------------------------------------------
--
-- The views to identify changes
--


CREATE TEMP VIEW viewNewDividend
  (ticker, date, dividend, currency, exdiv, declared, source, updated) AS
  SELECT a.ticker, a.date, a.dividend, a.currency, a.exdiv, a.declared, a.source, datetime('now')
  FROM temp_Dividend a
  LEFT JOIN Dividend b USING (ticker, date)
  WHERE
    (b.ticker, b.date) IS (NULL, NULL) OR
    (a.dividend, a.currency, a.exdiv, a.declared, a.source) IS NOT
    (b.dividend, b.currency, b.exdiv, b.declared, b.source);

CREATE TEMP VIEW viewOldDividend
  (ticker, date, dividend, currency, exdiv, declared, source, updated) AS
  SELECT ticker, date, NULL, NULL, NULL, NULL, NULL, datetime('now')
  FROM Dividend
  WHERE (ticker, date) NOT IN (
    SELECT ticker, date FROM temp_Dividend
  );

CREATE TEMP VIEW auditDividend
  (ticker, date, dividend, currency, exdiv, declared, source, updated) AS
  SELECT * FROM viewNewDividend UNION ALL SELECT * FROM viewOldDividend;

----------------------------------------------------------------
--
-- The stored proc to update the real table from the temp one
--

CREATE TEMP VIEW saveDividend(unused) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER saveDividend_t
  INSTEAD OF INSERT ON saveDividend
BEGIN
  INSERT INTO Dividend SELECT * FROM viewNewDividend WHERE true
    ON CONFLICT (ticker, date) DO UPDATE
      SET
        (dividend, currency, exdiv, declared, source) = 
          (EXCLUDED.dividend, EXCLUDED.currency, EXCLUDED.exdiv, EXCLUDED.declared, EXCLUDED.source),
        updated = EXCLUDED.updated
      WHERE
        (dividend, currency, exdiv, declared, source) IS NOT
          (EXCLUDED.dividend, EXCLUDED.currency, EXCLUDED.exdiv, EXCLUDED.declared, EXCLUDED.source);

  DELETE FROM Dividend
    WHERE (ticker, date) IN (SELECT ticker, date FROM viewOldDividend);

  DELETE FROM temp_Dividend;
END;

----------------------------------------------------------------
--
-- Position
--
----------------------------------------------------------------
--
-- The input table
--

CREATE TEMP TABLE temp_Position(
  ticker      TEXT NOT NULL,
  account     TEXT NOT NULL,
  who         TEXT NOT NULL,
  qty         INTEGER NOT NULL,
  PRIMARY KEY (ticker, account, who)
);

----------------------------------------------------------------
--
-- The views to identify changes
--

CREATE TEMP VIEW viewNewPosition
  (ticker, account, who, qty, updated) AS
  SELECT a.ticker, a.account, a.who, a.qty, datetime('now')
  FROM temp_Position a
  LEFT JOIN Position b USING (ticker, account, who)
  WHERE
    (b.ticker, b.account, b.who) IS (NULL, NULL, NULL) OR
    a.qty IS NOT b.qty;

CREATE TEMP VIEW viewOldPosition
  (ticker, account, who, qty, updated) AS
  SELECT ticker, account, who, NULL, datetime('now')
  FROM Position
  WHERE (ticker, account, who) NOT IN (
    SELECT ticker, account, who FROM temp_Position
  );

CREATE TEMP VIEW auditPosition
  (ticker, account, who, qty, updated) AS
  SELECT * FROM viewNewPosition UNION ALL SELECT * FROM viewOldPosition;

----------------------------------------------------------------
--
-- The stored proc to update the real table from the temp one
--

CREATE TEMP VIEW savePosition(unused) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER savePosition_t
  INSTEAD OF INSERT ON savePosition
BEGIN
  INSERT INTO Position SELECT * FROM viewNewPosition WHERE true
    ON CONFLICT (ticker, account, who) DO UPDATE
      SET
        qty = EXCLUDED.qty,
        updated = EXCLUDED.updated
      WHERE
        qty IS NOT EXCLUDED.qty;

  DELETE FROM Position
    WHERE (ticker, account, who) IN (SELECT ticker, account, who FROM viewOldPosition);
  DELETE FROM temp_Position;
END;

----------------------------------------------------------------
--
-- Trade
--
----------------------------------------------------------------
--
-- The input table
--
-- Trades have a seq which is added automatically
-- So there is a view without this to insert into


CREATE TEMP TABLE temp_Trade_Real(
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
  PRIMARY KEY (ticker, account, who, date, seq)
);

CREATE TEMP VIEW temp_Trade AS
  SELECT ticker, account, who, date, qty, cost, gain, proceeds, notes
  FROM temp_Trade_Real;

CREATE TEMP TRIGGER temp_Trade_ti INSTEAD OF INSERT ON temp_Trade
BEGIN
  INSERT INTO temp_Trade_Real
    (ticker, account, who, date, qty, cost, gain, proceeds, notes,
      seq) -- move seq to end for visibility
    SELECT
      NEW.ticker, NEW.account, NEW.who, NEW.date, NEW.qty, NEW.cost, NEW.gain, NEW.proceeds, NEW.notes,
      1 + COUNT(*) AS seq
    FROM temp_Trade_Real
    WHERE
      (ticker, account, who, date) IS
        (NEW.ticker, NEW.account, NEW.who, NEW.date);
END;

----------------------------------------------------------------
--
-- The views to identify changes
--

CREATE TEMP VIEW viewNewTrade
  (ticker, account, who, date, seq, qty, cost, gain, proceeds, notes, updated) AS
  SELECT a.ticker, a.account, a.who, a.date, a.seq, a.qty, a.cost, a.gain, a.proceeds, a.notes, datetime('now')
  FROM temp_Trade_Real a
  LEFT JOIN Trade b USING (ticker, account, who, date, seq)
  WHERE
    (b.ticker, b.account, b.who, b.date, b.seq) IS (NULL, NULL, NULL, NULL, NULL) OR
    (a.qty, a.cost, a.gain, a.proceeds, a.notes) IS NOT
    (b.qty, b.cost, b.gain, b.proceeds, b.notes);

CREATE TEMP VIEW viewOldTrade
  (ticker, account, who, date, seq, qty, cost, gain, proceeds, notes, updated) AS
  SELECT ticker, account, who, date, seq, NULL, NULL, NULL, NULL, NULL, datetime('now')
  FROM Trade
  WHERE (ticker, account, who, date, seq) NOT IN (
    SELECT ticker, account, who, date, seq FROM temp_Trade_Real
  );

CREATE TEMP VIEW auditTrade
  (ticker, account, who, date, seq, qty, cost, gain, proceeds, notes, updated) AS
  SELECT * FROM viewNewTrade UNION ALL SELECT * FROM viewOldTrade;

----------------------------------------------------------------
--
-- The stored proc to update the real table from the temp one
--

CREATE TEMP VIEW saveTrade(unused) AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER saveTrade_t
  INSTEAD OF INSERT ON saveTrade
BEGIN
  INSERT INTO Trade SELECT * FROM viewNewTrade WHERE true
    ON CONFLICT (ticker, account, who, date, seq) DO UPDATE
      SET
        (qty, cost, gain, proceeds, notes) =
          (EXCLUDED.qty, EXCLUDED.cost, EXCLUDED.gain, EXCLUDED.proceeds, EXCLUDED.notes),
        updated = EXCLUDED.updated
      WHERE
        (qty, cost, gain, proceeds, notes) IS NOT
          (EXCLUDED.qty, EXCLUDED.cost, EXCLUDED.gain, EXCLUDED.proceeds, EXCLUDED.notes);

  DELETE FROM Trade
    WHERE (ticker, account, who, date, seq) IN
      (SELECT ticker, account, who, date, seq FROM viewOldTrade);

  DELETE FROM temp_Trade_Real;
END;


----------------------------------------------------------------

COMMIT;

-- vim: ts=2:sts=2:sw=2:et
