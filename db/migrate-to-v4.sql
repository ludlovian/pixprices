-- vim: ft=sql ts=2:sts=2:sw=2:et
.header off
.mode list
select 'Migrating databases to schema v4 from v3';

--------------------------------------------------
-- History

.open new/history.db

delete from price;

attach 'history.db' as curr;

insert into price(
  ticker, jdate, price
) select
  ticker, jdate, price
from curr.price;

detach curr;

select 'history updated';

--------------------------------------------------
-- Audit

.open new/audit.db

delete from changes;

attach 'audit.db' as curr;

insert into changes (
  id, tableName, beforeData, afterData, timestamp
) select
  id,
  tableName,
  json_remove(beforeData,'$.updated'),
  json_remove(afterData, '$.updated'),
  updated
from curr.changes;

detach curr;

select 'audit updated';

--------------------------------------------------
-- Portfolio

.open new/portfolio.db

begin;
delete from stock;
delete from price;
delete from metric;
delete from dividend;
delete from position;
delete from trade;
commit;

attach 'portfolio.db' as curr;

begin;

insert into stock (
  ticker, name, incomeType, notes, currency, priceFactor, timestamp
) select
  ticker, name, incomeType, notes, currency, priceFactor, updated
from curr.stock;

insert into price (
  ticker, price, name, source, timestamp
) select
  ticker, price, name, source, updated
from curr.price;

insert into metric (
  ticker, dividend, nav, eps, timestamp
) select
  ticker, dividend, nav, eps, updated
from curr.metric;

insert into dividend (
  ticker, date, dividend, currency, exdiv, declared, source, timestamp
) select
  ticker, date, dividend, currency, exdiv, declared, source, updated
from curr.dividend;

insert into position (
  ticker, account, who, qty, timestamp
) select
  ticker, account, who, qty, updated
from curr.position;

insert into trade (
  tradeId, ticker, account, who, date, qty, cost, gain, proceeds, notes, timestamp
) select
  tradeId, ticker, account, who, date, qty, cost, gain, proceeds, notes, updated
from curr.trade;

commit;

detach curr;

select 'portfolio updated';
