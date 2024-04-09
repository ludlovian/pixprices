import { toDate, toSerial } from 'googlejs/sheets'
import sortBy from 'sortby'

import { Table, Row } from './sheetdb.mjs'
import dbConfig from './config.mjs'

class Prices extends Table {
  static instance () {
    return this._instance ?? (this._instance = new Prices())
  }

  constructor () {
    super({
      source: dbConfig.id,
      sheet: dbConfig.tables.prices,
      row: Price,
      columns: ['ticker', 'name', 'price', 'source', 'updated'],
      ...dbConfig.options
    })
  }

  save () {
    this.data = this.data.sort(sortBy('ticker'))
    return super.save()
  }

  applyChanges (changes) {
    const recent = Date.now() - dbConfig.recentUpdate
    const count = { updated: 0, skipped: 0 }

    for (const chg of changes) {
      const price = this.data.find(p => p.ticker === chg.ticker)
      if (price) {
        if (price.updated > recent) {
          count.skipped++
        } else {
          Object.assign(price, chg)
          count.updated++
        }
      } else {
        this.data.push(new Price(chg))
        count.updated++
      }
    }
    return count
  }

  clearOld () {
    const pruneDate = Date.now() - dbConfig.pruneAfter
    this.data = this.data.filter(p => p.updated > pruneDate)
  }
}

class Price extends Row {
  serialize () {
    return { ...this, updated: toSerial(this.updated) }
  }

  deserialize () {
    return { ...this, updated: toDate(this.updated) }
  }
}

export default Prices.instance()
