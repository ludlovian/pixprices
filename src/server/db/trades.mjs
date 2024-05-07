import { toDate, toSerial } from 'googlejs/sheets'
import sortBy from 'sortby'
import decimal from 'decimal'

import { Table } from './sheetdb.mjs'
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
      ],
      serialize: {
        date: toSerial,
        cost: fromDecimal,
        gain: fromDecimal,
        proceeds: fromDecimal
      },
      deserialize: {
        date: toDate,
        cost: toDecimal,
        gain: toDecimal,
        proceeds: toDecimal
      }
    })

    this.sortFunction = sortBy('date')
      .thenBy('who')
      .thenBy('account')
      .thenBy('ticker')
  }

  replaceFromSheetTrades (data) {
    // sheet trades has a "cost" column which is actually:
    // - cost adjustment for everything other than a sale
    // - negative proceeds for a sale
    //
    this.data = data.map(row => {
      const { cost: amount, ...rest } = row
      const cost = toDecimal(amount)
      const proceeds = rest.qty < 0 && cost ? cost.abs() : undefined
      const gain = undefined
      return { ...rest, cost, proceeds, gain }
    })

    this.recalcGains()
  }

  recalcGains () {
    this.data.sort(this.sortFunction)
    const prevTrades = []

    this.data.forEach(trade => {
      const { ticker, account, who, qty } = trade
      const key = [ticker, account, who].join(':')

      // is it a sale?
      if (qty < 0 && trade.cost) {
        const myTrades = prevTrades
          .filter(r => r[0] === key)
          .map(r => r.slice(1))

        trade.proceeds = decimal(trade.proceeds ?? trade.cost)
          .withPrecision(2)
          .abs()

        trade.cost = decimal(qty)
          .abs()
          .withPrecision(10)
          .mul(averageCost(myTrades))
          .withPrecision(2)
          .neg()

        trade.gain = trade.proceeds.sub(trade.cost.abs())
      } else {
        trade.gain = undefined
        trade.proceeds = undefined
      }
      prevTrades.push([key, trade.qty, trade.cost])
    })
  }
}

function averageCost (movements) {
  if (!movements.length) return 0
  const zero = decimal('0.00')
  const pos = { qty: 0, cost: zero }

  for (const [qty, cost] of movements) {
    if (qty < 0 && cost) {
      const old = { ...pos }
      pos.qty -= Math.abs(qty)
      pos.cost = old.qty ? old.cost.mul(pos.qty / old.qty) : zero
    } else {
      if (qty) pos.qty += qty
      if (cost) pos.cost = pos.cost.add(cost)
    }
  }
  return pos.qty ? pos.cost.toNumber() / pos.qty : 0
}

function toDecimal (n) {
  return typeof n === 'number' ? decimal(n).withPrecision(2) : n
}

function fromDecimal (n) {
  return decimal.isDecimal(n) ? Number(n.toString()) : n
}

export default Trades.instance()
