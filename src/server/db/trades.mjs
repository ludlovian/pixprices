import { toDate, toSerial } from 'googlejs/sheets'
import sortBy from 'sortby'

import { Table, Row } from './sheetdb.mjs'
import dbConfig from './config.mjs'

class Trades extends Table {
  static instance () {
    return this._instance ?? (this._instance = new Trades())
  }

  constructor () {
    super({
      ...dbConfig.options,
      source: dbConfig.id,
      sheet: dbConfig.tables.trades,
      row: Trade,
      columns: [
        'ticker',
        'account',
        'who',
        'date',
        'qty',
        'cost',
        'gain',
        'proceeds',
        'notes'
      ]
    })
  }

  sort () {
    const sortFn = sortBy('date')
      .thenBy('who')
      .thenBy('account')
      .thenBy('ticker')
    this.data = this.data.sort(sortFn)
  }

  save () {
    this.sort()
    return super.save()
  }

  replace (data) {
    this.data = data.map(obj => new Trade(obj))
    this.sort()
    this.calcGains()
  }

  calcGains () {
    this.sort()
    const positions = new Map()

    for (const trade of this.data) {
      trade.proceeds = undefined
      if (typeof trade.gain === 'number') {
        trade.cost = trade.cost - trade.gain
        trade.gain = undefined
      }
      const key = trade.positionKey
      if (!positions.has(key)) {
        positions.set(key, { qty: 0, cost: 0 })
      }
      const pos = positions.get(key)

      if (trade.cost && !trade.qty) {
        // Adjustment in cost
        //
        pos.cost += trade.cost
      } else if (trade.qty && !trade.cost) {
        // Adjustment in qty
        //
        pos.qty += trade.qty
      } else if (trade.cost && trade.qty > 0) {
        // Buy trade
        //
        pos.qty += trade.qty
        pos.cost += trade.cost
      } else if (trade.cost && trade.qty < 0) {
        // Sell trade with possible gain/loss
        //
        const { qty: prevQty, cost: prevCost } = pos
        trade.proceeds = Math.abs(trade.cost)
        pos.qty += trade.qty
        // what proportion remains?
        const remain = prevQty ? pos.qty / prevQty : 0
        // get the new base cost
        pos.cost = round100(prevCost * remain)
        // trade cost is the -ve reduction to achieve that
        trade.cost = pos.cost - prevCost
        // gain is the proceeds less ABS(cost)
        trade.gain = trade.proceeds + trade.cost // cost is -ve
      }
    }
  }
}

class Trade extends Row {
  serialize () {
    return { ...this, date: toSerial(this.date) }
  }

  deserialize () {
    return { ...this, date: toDate(this.date) }
  }

  get positionKey () {
    return [this.ticker, this.account, this.who].join(':')
  }
}

function round100 (n) {
  return typeof n === 'number' ? Math.round(100 * n) / 100 : n
}

export default Trades.instance()
