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

CREATE TEMP VIEW vAddStock
  (ticker, name, incomeType, notes, currency, priceFactor, updated) AS
  SELECT a.ticker, a.name, a.incomeType, a.notes, a.currency, a.priceFactor, datetime('now')
  FROM temp_Stock a
  LEFT JOIN Stock b USING (ticker)
  WHERE
    b.ticker IS NULL OR
    (a.name, a.incomeType, a.notes, a.currency, a.priceFactor) IS NOT
    (b.name, b.incomeType, b.notes, b.currency, b.priceFactor);

CREATE TEMP VIEW vDelStock
  (ticker, name, incomeType, notes, currency, priceFactor, updated) AS
  SELECT ticker, NULL, NULL, NULL, NULL, NULL, datetime('now')
  FROM Stock
  WHERE ticker NOT IN (
    SELECT ticker FROM temp_Stock
  );

CREATE TEMP VIEW vAuditStock
  (ticker, name, incomeType, notes, currency, priceFactor, updated) AS
  SELECT * FROM vAddStock UNION ALL SELECT * FROM vDelStock;

----------------------------------------------------------------
--
-- The stored proc to update the real table from the temp one
--

CREATE TEMP VIEW spSaveStock AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER sptSaveStock
  INSTEAD OF INSERT ON spSaveStock
BEGIN
  INSERT OR REPLACE INTO Stock SELECT * FROM vAddStock;
  DELETE FROM Stock
    WHERE ticker IN (SELECT ticker FROM vDelStock);
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

CREATE TEMP VIEW vAddPrice
  (ticker, name, price, source, updated) AS
  SELECT a.ticker, a.name, a.price, a.source, datetime('now')
  FROM temp_Price a
  LEFT JOIN Price b USING (ticker)
  WHERE
    b.ticker IS NULL OR
    (a.name, a.price, a.source) IS NOT
    (b.name, b.price, b.source);

CREATE TEMP VIEW vDelPrice
  (ticker, name, price, source, updated) AS
  SELECT ticker, NULL, NULL, NULL, datetime('now')
  FROM Price
  WHERE ticker NOT IN (
    SELECT ticker FROM temp_Price
  );

CREATE TEMP VIEW vAuditPrice
  (ticker, name, price, source, updated) AS
  SELECT * from vAddPrice UNION ALL SELECT * FROM vDelPrice;

----------------------------------------------------------------
--
-- The stored proc to update the real table from the temp one
--

CREATE TEMP VIEW spSavePrice AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER sptSavePrice
  INSTEAD OF INSERT ON spSavePrice
BEGIN
  INSERT OR REPLACE INTO Price SELECT * FROM vAddPrice;
  DELETE FROM Price
    WHERE ticker IN (SELECT ticker FROM vDelPrice);
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

CREATE TEMP VIEW vAddMetric
  (ticker, dividend, nav, eps, updated) AS
  SELECT a.ticker, a.dividend, a.nav, a.eps, datetime('now')
  FROM temp_Metric a
  LEFT JOIN Metric b USING (ticker)
  WHERE
    b.ticker IS NULL OR
    (a.dividend, a.nav, a.eps) IS NOT
    (b.dividend, b.nav, b.eps);

CREATE TEMP VIEW vDelMetric
  (ticker, dividend, nav, eps, updated) AS
  SELECT ticker, NULL, NULL, NULL, datetime('now')
  FROM Metric
  WHERE ticker NOT IN (
    SELECT ticker FROM temp_Metric
  );

CREATE TEMP VIEW vAuditMetric
  (ticker, dividend, nav, eps, updated) AS
  SELECT * from vAddMetric UNION ALL SELECT * FROM vDelMetric;

----------------------------------------------------------------
--
-- The stored proc to update the real table from the temp one
--

CREATE TEMP VIEW spSaveMetric AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER sptSaveMetric
  INSTEAD OF INSERT ON spSaveMetric
BEGIN
  INSERT OR REPLACE INTO Metric SELECT * FROM vAddMetric;
  DELETE FROM Metric
    WHERE ticker IN (SELECT ticker FROM vDelMetric);
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
  date        TEXT NOT NULL,
  ticker      TEXT NOT NULL,
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


CREATE TEMP VIEW vAddDividend
  (date, ticker, dividend, currency, exdiv, declared, source, updated) AS
  SELECT a.date, a.ticker, a.dividend, a.currency, a.exdiv, a.declared, a.source, datetime('now')
  FROM temp_Dividend a
  LEFT JOIN Dividend b USING (ticker, date)
  WHERE
    (b.ticker, b.date) IS (NULL, NULL) OR
    (a.dividend, a.currency, a.exdiv, a.declared, a.source) IS NOT
    (b.dividend, b.currency, b.exdiv, b.declared, b.source);

CREATE TEMP VIEW vDelDividend
  (date, ticker, dividend, currency, exdiv, declared, source, updated) AS
  SELECT date, ticker, NULL, NULL, NULL, NULL, NULL, datetime('now')
  FROM Dividend
  WHERE (ticker, date) NOT IN (
    SELECT ticker, date FROM temp_Dividend
  );

CREATE TEMP VIEW vAuditDividend
  (date, ticker, dividend, currency, exdiv, declared, source, updated) AS
  SELECT * FROM vAddDividend UNION ALL SELECT * FROM vDelDividend;

----------------------------------------------------------------
--
-- The stored proc to update the real table from the temp one
--

CREATE TEMP VIEW spSaveDividend AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER sptSaveDividend
  INSTEAD OF INSERT ON spSaveDividend
BEGIN
  INSERT OR REPLACE INTO Dividend SELECT * FROM vAddDividend;
  DELETE FROM Dividend
    WHERE (ticker, date) IN (SELECT ticker, date FROM vDelDividend);
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

CREATE TEMP VIEW vAddPosition
  (ticker, account, who, qty, updated) AS
  SELECT a.ticker, a.account, a.who, a.qty, datetime('now')
  FROM temp_Position a
  LEFT JOIN Position b USING (ticker, account, who)
  WHERE
    (b.ticker, b.account, b.who) IS (NULL, NULL, NULL) OR
    a.qty IS NOT b.qty;

CREATE TEMP VIEW vDelPosition
  (ticker, account, who, qty, updated) AS
  SELECT ticker, account, who, NULL, datetime('now')
  FROM Position
  WHERE (ticker, account, who) NOT IN (
    SELECT ticker, account, who FROM temp_Position
  );

CREATE TEMP VIEW vAuditPosition
  (ticker, account, who, qty, updated) AS
  SELECT * FROM vAddPosition UNION ALL SELECT * FROM vDelPosition;

----------------------------------------------------------------
--
-- The stored proc to update the real table from the temp one
--

CREATE TEMP VIEW spSavePosition AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER sptSavePosition
  INSTEAD OF INSERT ON spSavePosition
BEGIN
  INSERT OR REPLACE INTO Position SELECT * FROM vAddPosition;
  DELETE FROM Position
    WHERE (ticker, account, who) IN (SELECT ticker, account, who FROM vDelPosition);
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

CREATE TEMP TABLE temp_Trade(
  ticker      TEXT NOT NULL,
  account     TEXT NOT NULL,
  who         TEXT NOT NULL,
  date        TEXT NOT NULL,
  seq         INTEGER NOT NULL DEFAULT 0,
  qty         INTEGER,
  cost        INTEGER,
  gain        INTEGER,
  proceeds    INTEGER,
  notes       TEXT,
  PRIMARY KEY (ticker, account, who, date, seq)
);

CREATE TEMP TRIGGER temp_Trade_ti AFTER INSERT ON temp_Trade
BEGIN
  UPDATE temp_Trade
    SET seq = (
      SELECT COUNT(*) FROM temp_Trade
      WHERE (ticker, account, who, date) = (NEW.ticker, NEW.account, NEW.who, NEW.date)
    )
  WHERE (ticker, account, who, date, seq) = (NEW.ticker, NEW.account, NEW.who, NEW.date, NEW.seq);
END;

----------------------------------------------------------------
--
-- The views to identify changes
--

CREATE TEMP VIEW vAddTrade
  (ticker, account, who, date, seq, qty, cost, gain, proceeds, notes, updated) AS
  SELECT a.ticker, a.account, a.who, a.date, a.seq, a.qty, a.cost, a.gain, a.proceeds, a.notes, datetime('now')
  FROM temp_Trade a
  LEFT JOIN Trade b USING (ticker, account, who, date, seq)
  WHERE
    (b.ticker, b.account, b.who, b.date, b.seq) IS (NULL, NULL, NULL, NULL, NULL) OR
    (a.qty, a.cost, a.gain, a.proceeds, a.notes) IS NOT
    (b.qty, b.cost, b.gain, b.proceeds, b.notes);

CREATE TEMP VIEW vDelTrade
  (ticker, account, who, date, seq, qty, cost, gain, proceeds, notes, updated) AS
  SELECT ticker, account, who, date, seq, NULL, NULL, NULL, NULL, NULL, datetime('now')
  FROM Trade
  WHERE (ticker, account, who, date, seq) NOT IN (
    SELECT ticker, account, who, date, seq FROM temp_Trade
  );

CREATE TEMP VIEW vAuditTrade
  (ticker, account, who, date, seq, qty, cost, gain, proceeds, notes, updated) AS
  SELECT * FROM vAddTrade UNION ALL SELECT * FROM vDelTrade;

----------------------------------------------------------------
--
-- The stored proc to update the real table from the temp one
--


CREATE TEMP VIEW spSaveTrade AS SELECT 0 WHERE 0;
CREATE TEMP TRIGGER sptSaveTrade
  INSTEAD OF INSERT ON spSaveTrade
BEGIN
  INSERT OR REPLACE INTO Trade SELECT * FROM vAddTrade;
  DELETE FROM Trade
    WHERE (ticker, account, who, date, seq) IN
      (SELECT ticker, account, who, date, seq FROM vDelTrade);
  DELETE FROM temp_Trade;
END;


----------------------------------------------------------------

COMMIT;

-- vim: ts=2:sts=2:sw=2:et
