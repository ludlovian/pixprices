import { toDate, toSerial } from 'googlejs/sheets'
import sortBy from 'sortby'

import { Table } from './sheetdb.mjs'
import dbConfig from './config.mjs'

class Prices extends Table {
  static instance () {
    return this._instance ?? (this._instance = new Prices())
  }

  constructor () {
    super({
      source: dbConfig.id,
      sheet: dbConfig.tables.prices,
      columns: ['ticker', 'name', 'price', 'source', 'updated'],
      serialize: { updated: toSerial },
      deserialize: { updated: toDate },
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
        this.data.push(chg)
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

export default Prices.instance()
