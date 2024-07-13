import decimal from '@ludlovian/decimal'
import Database from '@ludlovian/sheetdb'
import config from '../config.mjs'
import { xl2js, js2xl } from '../dates.mjs'

Database.registerType('date', {
  fromSheet: x => (x === '' ? undefined : xl2js(x)),
  toSheet: x => (x === undefined ? '' : js2xl(x))
})
Database.registerType('money', {
  fromSheet: x => (x === '' ? undefined : decimal(x).withPrecision(2)),
  toSheet: x => (x === undefined ? '' : +x)
})

export function createDB () {
  const db = new Database(config.spreadsheetId)

  return db
    .addTable('stocks', {
      name: 'Stocks',
      cols: 'ticker,name,incomeType,notes,currency,priceFactor:number',
      key: 'ticker'
    })
    .addTable('prices', {
      name: 'Prices',
      cols: 'ticker,name,price:number,source,updated:date',
      key: 'ticker'
    })
    .addTable('metrics', {
      name: 'Metrics',
      cols: 'ticker,dividend:number,nav:number,eps:number',
      key: 'ticker'
    })
    .addTable('dividends', {
      name: 'Dividends',
      cols:
        'date:date,ticker,dividend:number,currency,' +
        'exdiv:date,declared:date,source,updated:date',
      key: 'date,ticker'
    })
    .addTable('positions', {
      name: 'Positions',
      cols: 'ticker,account,who,qty:number',
      key: 'ticker,account,who'
    })
    .addTable('trades', {
      name: 'Trades',
      cols:
        'ticker,account,who,date:date,qty:number,' +
        'cost:money,gain:money,proceeds:money,notes'
    })
}
