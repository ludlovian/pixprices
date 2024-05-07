import { parse as parseMs } from '@lukeed/ms'
import { toDate, toSerial } from 'googlejs/sheets'
import sortBy from 'sortby'

import { Table } from './sheetdb.mjs'
import dbConfig from './config.mjs'

class Dividends extends Table {
  static instance () {
    return this._instance ?? (this._instance = new Dividends())
  }

  constructor () {
    super({
      source: dbConfig.id,
      sheet: dbConfig.tables.dividends,
      columns: [
        'date',
        'ticker',
        'div',
        'ccy',
        'exdiv',
        'declared',
        'source',
        'updated'
      ],
      serialize: {
        date: toSerial,
        exdiv: toSerial,
        declared: toSerial,
        updated: toSerial
      },
      deserialize: {
        date: toDate,
        exdiv: toDate,
        declared: toDate,
        updated: toDate
      },
      ...dbConfig.options
    })
  }

  save () {
    this.data = this.data.sort(sortBy('date').thenBy('ticker'))
    return super.save()
  }

  apply (changes) {
    const count = { updated: 0, total: 0, added: 0 }

    for (const chg of changes) {
      count.total++
      const div = this.data.find(
        d => +d.date === +chg.date && d.ticker === chg.ticker
      )
      if (div) {
        Object.assign(div, chg)
        count.updated++
      } else {
        this.data.push(chg)
        count.added++
      }
    }

    return count
  }

  clearOld ({ age = parseMs('500d') } = {}) {
    const pruneDate = Date.now() - age
    this.data = this.data.filter(d => d.updated > pruneDate)
  }
}

export default Dividends.instance()
