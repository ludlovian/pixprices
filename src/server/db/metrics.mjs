import sortBy from 'sortby'

import { Table, Row } from './sheetdb.mjs'
import dbConfig from './config.mjs'

class Metrics extends Table {
  static instance () {
    return this._instance ?? (this._instance = new Metrics())
  }

  constructor () {
    super({
      ...dbConfig.options,
      source: dbConfig.id,
      sheet: dbConfig.tables.metrics,
      row: Metric,
      columns: ['ticker', 'dividend', 'nav', 'eps']
    })
  }

  sort () {
    this.data = this.data.sort(sortBy('ticker'))
  }

  save () {
    this.sort()
    return super.save()
  }

  replace (data) {
    this.data = data.map(obj => new Metric(obj))
    this.sort()
  }
}

class Metric extends Row {}

export default Metrics.instance()
