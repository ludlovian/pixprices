import sortBy from 'sortby'

import { Table } from './sheetdb.mjs'
import dbConfig from './config.mjs'

class Stocks extends Table {
  static instance () {
    return this._instance ?? (this._instance = new Stocks())
  }

  constructor () {
    super({
      ...dbConfig.options,
      source: dbConfig.id,
      sheet: dbConfig.tables.stocks,
      columns: [
        'ticker',
        'name',
        'incomeType',
        'notes',
        'currency',
        'priceFactor'
      ]
    })
  }

  sort () {
    this.data = this.data.sort(sortBy('ticker'))
  }

  save () {
    this.sort()
    return super.save()
  }

  addNew ({ ticker, name }) {
    this.data.push({
      ticker,
      name,
      notes: 'Automatically added',
      currency: 'GBP',
      priceFactor: 100
    })
    this.sort()
  }
}

export default Stocks.instance()
