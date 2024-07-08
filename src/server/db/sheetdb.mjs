import Database from '@ludlovian/sheetdb'
import config from '../config.mjs'

export function createDB () {
  const db = new Database(config.spreadsheetId)

  return db
    .addTable('stocks', {
      name: 'Stocks',
      cols: 'ticker,name,incomeType,notes,currency,priceFactor:number',
      sort: 'ticker'
    })
    .addTable('prices', {
      name: 'Prices',
      cols: 'ticker,name,price:number,source,updated:date',
      sort: 'ticker'
    })
    .addTable('metrics', {
      name: 'Metrics',
      cols: 'ticker,dividend:number,nav:number,eps:number',
      sort: 'ticker'
    })
    .addTable('dividends', {
      name: 'Dividends',
      cols:
        'date:date,ticker,dividend:number,currency,' +
        'exdiv:date,declared:date,source,updated:date',
      sort: 'date,ticker'
    })
    .addTable('positions', {
      name: 'Positions',
      cols: 'ticker,account,who,qty:number',
      sort: 'ticker,account,who'
    })
    .addTable('trades', {
      name: 'Trades',
      cols:
        'ticker,account,who,date:date,qty:number,' +
        'cost:money,gain:money,proceeds:money,notes',
      sort: 'date,who,account,ticker'
    })
}
