import sortBy from 'sortby'

import { Table, Row } from './sheetdb.mjs'
import dbConfig from './config.mjs'

class Positions extends Table {
  static instance () {
    return this._instance ?? (this._instance = new Positions())
  }

  constructor () {
    super({
      ...dbConfig.options,
      source: dbConfig.id,
      sheet: dbConfig.tables.positions,
      row: Position,
      columns: ['ticker', 'account', 'who', 'qty']
    })
  }

  sort () {
    const sortFn = sortBy('ticker')
      .thenBy('account')
      .thenBy('who')
    this.data = this.data.sort(sortFn)
  }

  save () {
    this.sort()
    return super.save()
  }

  replace (data) {
    this.data = data.map(obj => new Position(obj))
    this.sort()
  }
}

class Position extends Row {}

export default Positions.instance()
