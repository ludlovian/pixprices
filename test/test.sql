.output
.headers off
.mode list

select 'Setting up databases';
.open test/audit.db
.read sql/audit.sql

.open test/portfolio.db
.read sql/ddl.sql
.read sql/temp.sql

ATTACH 'test/audit.db' AS audit;
BEGIN TRANSACTION;

--------------- 
-- clear databases
select 'Clearing databases';

delete from audit.Stock;
delete from audit.Metric;
delete from audit.Dividend;
delete from audit.Position;
delete from audit.Trade;

delete from Stock;
delete from Price;
delete from Metric;
delete from Dividend;
delete from Position;
delete from Trade;

--------------------
select 'testing Stock';

-- inital values
insert into temp_Stock
(ticker, name, incomeType, notes, currency, priceFactor)
VALUES
('t1', 'name1', 'it1', 'note1', 'ccy1', 111),
('t2', 'name2', 'it2', 'note2', 'ccy2', 222);
insert into audit.Stock select * from auditStock;
insert into saveStock values(null);

-- no change
insert into temp_Stock
(ticker, name, incomeType, notes, currency, priceFactor)
VALUES
('t1', 'name1', 'it1', 'note1', 'ccy1', 111),
('t2', 'name2', 'it2', 'note2', 'ccy2', 222);
insert into audit.Stock select * from auditStock;
insert into saveStock values(null);

-- modify
insert into temp_Stock
(ticker, name, incomeType, notes, currency, priceFactor)
VALUES
('t1', 'name1', 'it1', 'note1', 'ccy1', 111),
('t2', 'name3', 'it2', 'note2', 'ccy2', 222);
insert into audit.Stock select * from auditStock;
insert into saveStock values(null);

-- delete
insert into temp_Stock
(ticker, name, incomeType, notes, currency, priceFactor)
VALUES
('t2', 'name3', 'it2', 'note2', 'ccy2', 222);
insert into audit.Stock select * from auditStock;
insert into saveStock values(null);

----------------------
select 'testing Price';

-- inital values
insert into temp_Price
(ticker, name, price, source)
VALUES
('t1', 'name1', 111, 'source1'),
('t2', 'name2', 222, 'source2');
insert into savePrice values(null);

-- no change
insert into temp_Price
(ticker, name, price, source)
VALUES
('t1', 'name1', 111, 'source1'),
('t2', 'name2', 222, 'source2');
insert into savePrice values(null);

-- modify
insert into temp_Price
(ticker, name, price, source)
VALUES
('t1', 'name1', 111, 'source1'),
('t2', 'name2', 223, 'source2');
insert into savePrice values(null);

-- delete
insert into temp_Price
(ticker, name, price, source)
VALUES
('t2', 'name2', 223, 'source2');
insert into savePrice values(null);

----------------------
select 'testing Metric';

-- inital values
insert into temp_Metric
(ticker, dividend, nav, eps)
VALUES
('t1', 1, 11, 111),
('t2', 2, 22, 222);
insert into audit.Metric select * from auditMetric;
insert into saveMetric values(null);

-- no change
insert into temp_Metric
(ticker, dividend, nav, eps)
VALUES
('t1', 1, 11, 111),
('t2', 2, 22, 222);
insert into audit.Metric select * from auditMetric;
insert into saveMetric values(null);

-- modify
insert into temp_Metric
(ticker, dividend, nav, eps)
VALUES
('t1', 1, 11, 111),
('t2', 2, 23, 222);
insert into audit.Metric select * from auditMetric;
insert into saveMetric values(null);

-- delete
insert into temp_Metric
(ticker, dividend, nav, eps)
VALUES
('t2', 2, 23, 222);
insert into audit.Metric select * from auditMetric;
insert into saveMetric values(null);

----------------------
select 'testing Dividend';

-- inital values
insert into temp_Dividend
(ticker, date, dividend, currency, exdiv, declared, source)
VALUES
('t1', '2024-01-01', 1, 'ccy1', '2023-01-01', '2022-01-01', 's1'),
('t2', '2024-01-01', 2, 'ccy2', '2023-02-01', '2022-02-01', 's2');
insert into audit.Dividend select * from auditDividend;
insert into saveDividend values(null);

-- no change
insert into temp_Dividend
(ticker, date, dividend, currency, exdiv, declared, source)
VALUES
('t1', '2024-01-01', 1, 'ccy1', '2023-01-01', '2022-01-01', 's1'),
('t2', '2024-01-01', 2, 'ccy2', '2023-02-01', '2022-02-01', 's2');
insert into audit.Dividend select * from auditDividend;
insert into saveDividend values(null);

-- modify
insert into temp_Dividend
(ticker, date, dividend, currency, exdiv, declared, source)
VALUES
('t1', '2024-01-01', 1, 'ccy1', '2023-01-01', '2022-01-01', 's1'),
('t2', '2024-01-01', 2, 'ccy2', '2023-02-02', '2022-02-01', 's2');
insert into audit.Dividend select * from auditDividend;
insert into saveDividend values(null);

-- delete
insert into temp_Dividend
(ticker, date, dividend, currency, exdiv, declared, source)
VALUES
('t2', '2024-01-01', 2, 'ccy2', '2023-02-02', '2022-02-01', 's2');
insert into audit.Dividend select * from auditDividend;
insert into saveDividend values(null);

----------------------
select 'testing Position';

-- inital values
insert into temp_Position
(ticker, account, who, qty)
VALUES
('t1', 'a1', 'w1', 1),
('t2', 'a2', 'w2', 2);
insert into audit.Position select * from auditPosition;
insert into savePosition values(null);

-- no change
insert into temp_Position
(ticker, account, who, qty)
VALUES
('t1', 'a1', 'w1', 1),
('t2', 'a2', 'w2', 2);
insert into audit.Position select * from auditPosition;
insert into savePosition values(null);

-- modify
insert into temp_Position
(ticker, account, who, qty)
VALUES
('t1', 'a1', 'w1', 1),
('t2', 'a2', 'w2', 3);
insert into audit.Position select * from auditPosition;
insert into savePosition values(null);

-- delete
insert into temp_Position
(ticker, account, who, qty)
VALUES
('t2', 'a2', 'w2', 3);
insert into audit.Position select * from auditPosition;
insert into savePosition values(null);

----------------------
select 'testing Trade';

-- inital values
insert into temp_Trade
(ticker, account, who, date, qty, cost, gain, proceeds, notes)
VALUES
('t1', 'a1', 'w1', '2024-01-01', 1, 11, 111, 1111, 'n1'),
('t1', 'a1', 'w1', '2024-01-01', 2, 22, 222, 2222, 'n2'),
('t2', 'a2', 'w2', '2024-01-02', 3, 33, 333, 3333, 'n3'),
('t2', 'a2', 'w2', '2024-01-02', 4, 44, 444, 4444, 'n4');
insert into audit.Trade select * from auditTrade;
insert into saveTrade values(null);

-- no change
insert into temp_Trade
(ticker, account, who, date, qty, cost, gain, proceeds, notes)
VALUES
('t1', 'a1', 'w1', '2024-01-01', 1, 11, 111, 1111, 'n1'),
('t1', 'a1', 'w1', '2024-01-01', 2, 22, 222, 2222, 'n2'),
('t2', 'a2', 'w2', '2024-01-02', 3, 33, 333, 3333, 'n3'),
('t2', 'a2', 'w2', '2024-01-02', 4, 44, 444, 4444, 'n4');
insert into audit.Trade select * from auditTrade;
insert into saveTrade values(null);

-- modify
insert into temp_Trade
(ticker, account, who, date, qty, cost, gain, proceeds, notes)
VALUES
('t1', 'a1', 'w1', '2024-01-01', 1, 11, 111, 1111, 'n1'),
('t1', 'a1', 'w1', '2024-01-01', 2, 22, 222, 2222, 'n2'),
('t2', 'a2', 'w2', '2024-01-02', 3, 33, 333, 3333, 'n3'),
('t2', 'a2', 'w2', '2024-01-02', 4, 44, 444, 5555, 'n4');
insert into audit.Trade select * from auditTrade;
insert into saveTrade values(null);

-- delete
insert into temp_Trade
(ticker, account, who, date, qty, cost, gain, proceeds, notes)
VALUES
('t1', 'a1', 'w1', '2024-01-01', 2, 22, 222, 2222, 'n2'),
('t2', 'a2', 'w2', '2024-01-02', 3, 33, 333, 3333, 'n3'),
('t2', 'a2', 'w2', '2024-01-02', 4, 44, 444, 5555, 'n4');
insert into audit.Trade select * from auditTrade;
insert into saveTrade values(null);

COMMIT;

.headers on
.mode column
