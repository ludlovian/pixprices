-- Backups and daily roll

.mode list
.headers off
select 'Backing up databases';

-----------------------------------------------------
-- History database

.open db/history.db
attach 'db/portfolio.db' as p;

insert into main.Price (ticker, jdate, price)
  select
    ticker,
    julianday('now','start of day') as jdate,
    price
  from p.Price
  where true
on conflict (ticker, jdate) do update
  set price = excluded.price
    where price is not excluded.price;

detach p;
vacuum;
.backup backup/history.db

select 'history.db ... complete';

-----------------------------------------------------
-- Main database

.open db/portfolio.db
.backup backup/portfolio.db
vacuum;

select 'portfolio.db ... complete';

-----------------------------------------------------
-- Audit database

.open db/audit.db
vacuum;
.backup backup/audit.db

select 'audit.db ... complete';
