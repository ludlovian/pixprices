import { parse as parseMs } from '@lukeed/ms'
import { toDate, toSerial } from 'googlejs/sheets'
import sortBy from 'sortby'

import { Table, Row } from './sheetdb.mjs'
import dbConfig from './config.mjs'

class Dividends extends Table {
  static instance () {
    return this._instance ?? (this._instance = new Dividends())
  }

  constructor () {
    super({
      source: dbConfig.id,
      sheet: dbConfig.tables.dividends,
      row: Dividend,
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
      ...dbConfig.options
    })
  }

  save () {
    this.data = this.data.sort(sortBy('date').thenBy('ticker'))
    return super.save()
  }

  apply (changes) {
    const count = { updated: 0 }

    for (const chg of changes) {
      const div = this.data.find(
        d => +d.date === +chg.date && d.ticker === chg.ticker
      )
      if (div) {
        Object.assign(div, chg)
        count.updated++
      } else {
        this.data.push(new Dividend(chg))
        count.updated++
      }
    }

    return count
  }

  clearOld ({ age = parseMs('500d') } = {}) {
    const pruneDate = Date.now() - age
    this.data = this.data.filter(d => d.updated > pruneDate)
  }
}

class Dividend extends Row {
  static dateFields = 'date,exdiv,declared,updated'.split(',')

  serialize () {
    const obj = { ...this }
    for (const fld of Dividend.dateFields) {
      if (obj[fld] instanceof Date) obj[fld] = toSerial(obj[fld])
    }
    return obj
  }

  deserialize () {
    const obj = { ...this }
    for (const fld of Dividend.dateFields) {
      if (typeof obj[fld] === 'number') obj[fld] = toDate(obj[fld])
    }
    return obj
  }
}

export default Dividends.instance()
