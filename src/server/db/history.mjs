export default `
----------------------------------------------------------------
-- Holds the schema number
--
CREATE TABLE IF NOT EXISTS schema (
  id INTEGER PRIMARY KEY NOT NULL check (id = 1),
  version INTEGER NOT NULL
);
INSERT OR REPLACE INTO schema VALUES(1, 1);

----------------------------------------------------------------
--
-- Price
--

CREATE TABLE IF NOT EXISTS Price (
  ticker      TEXT NOT NULL,
  jdate       REAL NOT NULL,
  price       NUMBER,
  date        TEXT GENERATED ALWAYS AS (date(jdate)) VIRTUAL,
  PRIMARY KEY (ticker, jdate)
);
-- vim: ft=sql ts=2:sts=2:sw=2:et
`
