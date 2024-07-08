import Debug from '@ludlovian/debug'
import Job from '../model/job.mjs'
import { readSheet as _readSheet, toDate } from '@ludlovian/sheetdb'
import decimal from '@ludlovian/decimal'
import database from '../db/index.mjs'

const debug = Debug('pixprices:import-portfolio')

export default class ImportPortfolio extends Job {
  spreadsheetId
  portfolioRange
  portfolioColumnRow
  tradesRange
  tradesColumnRow

  constructor (schedule, data) {
    super(schedule, data)
    this.spreadsheetId = data.spreadsheetId
    this.portfolioRange = data.portfolioRange
    this.portfolioColumnRow = data.portfolioColumnRow
    this.tradesRange = data.tradesRange
    this.tradesColumnRow = data.tradesColumnRow
  }

  start (task) {
    this.#importPortfolio(task).catch(err => {
      console.error(err)
      task.failTask(err.message)
    })

    return {}
  }

  async #importPortfolio (task) {
    const { positions, metrics, trades } = database.tables
    const data = await this.#importPositionsAndMetrics()

    debug('Imported %d positions', data.positions.length)
    await positions.save(data.positions)

    debug('Imported %d metrics', data.metrics.length)
    await metrics.save(data.metrics)

    const tradesData = await this.#importTrades()

    debug('Imported %d trades', tradesData.length)
    await trades.save(tradesData)

    await this.#checkMissingStocks()

    const msg =
      `Imported ${positions.data.length} positions ` +
      `and ${trades.data.length} trades`
    task.completeTask(msg)
  }

  async #importPositionsAndMetrics () {
    const data = (
      await readSheet(
        this.spreadsheetId,
        this.portfolioRange,
        this.portfolioColumnRow
      )
    ).filter(({ ticker }) => !!ticker)

    debug('Loaded %d rows from Investments', data.length)

    return {
      positions: readPositions(data),
      metrics: readMetrics(data)
    }
  }

  async #importTrades () {
    const data = (
      await readSheet(
        this.spreadsheetId,
        this.tradesRange,
        this.tradesColumnRow
      )
    ).filter(({ ticker }) => !!ticker)

    debug('Loaded %d rows from Trades', data.length)
    const trades = readTrades(data)

    return calcGains(trades)
  }

  async #checkMissingStocks () {
    const { stocks, prices, trades } = database.tables
    await stocks.load()
    await trades.load()

    // find all the tickers in use
    const tickers = new Set(trades.data.map(t => t.ticker))

    // and ignore all the ones we already have
    stocks.data.forEach(s => tickers.delete(s.ticker))

    // bail out if there are none missing
    // although we resave stocks to ensure DB has it
    if (!tickers.size) {
      await stocks.save()
      return
    }

    // so we need new ones - let's get the names from prices if we have them
    await prices.load()
    for (const ticker of tickers) {
      const price = prices.data.find(p => p.ticker === ticker)
      if (price) {
        const name = price?.name
        stocks.data.push({
          ticker,
          name,
          notes: 'Automatically added',
          currency: 'GBP',
          priceFactor: 100
        })
      } else {
        debug('Cannot find a price for %s', ticker)
      }
    }
    debug('Added tickers: %s', [...tickers].join(','))
    await stocks.save()
  }
}

// -------------------------------------------------
//
// Reading the portfolio sheet

function readPositions (data) {
  return data.map(readPositionsFromRow).flat()
}

function readPositionsFromRow (row) {
  return Object.entries(row)
    .filter(([colName, qty]) => colName.includes(':') && qty)
    .map(([colName, qty]) => {
      const [account, who] = colName.split(':')
      return { ticker: row.ticker, account, who, qty }
    })
}

function readMetrics (data) {
  return data
    .filter(({ nav, eps, div }) => nav || eps || div)
    .map(({ div, ...rest }) => ({ ...rest, dividend: div }))
}

// -------------------------------------------------
//
// Reading the trades sheet
//
// Including the calculation of gains

function readTrades (data) {
  // sheet trades has a "cost" column which is actually:
  // - cost adjustment for everything other than a sale
  // - negative proceeds for a sale
  return data.map(row => {
    const { cost: amount, date: serialDate, ...rest } = row
    const date = serialDate ? toDate(serialDate) : serialDate
    if (row.qty < 0 && amount) {
      return {
        date,
        ...rest,
        proceeds: decimal(amount)
          .abs()
          .withPrecision(2)
      }
    } else {
      return {
        date,
        ...rest,
        cost:
          amount === undefined ? undefined : decimal(amount).withPrecision(2)
      }
    }
  })
}

function calcGains (trades) {
  const prevTrades = []
  trades.forEach(trade => {
    const { ticker, account, who, qty } = trade
    const key = [ticker, account, who].join(':')

    if (qty < 0 && trade.proceeds) {
      const myTrades = prevTrades.filter(r => r[0] === key).map(r => r.slice(1))

      trade.cost = decimal(qty)
        .abs()
        .withPrecision(10)
        .mul(averageCost(myTrades))
        .withPrecision(2)
        .neg()

      trade.gain = trade.proceeds.sub(trade.cost.abs())
    }
    prevTrades.push([key, trade.qty, trade.cost])
  })
  return trades
}

function averageCost (trades) {
  if (!trades.length) return 0
  const zero = decimal('0.00')
  const pos = { qty: 0, cost: zero }

  for (const [qty, cost] of trades) {
    if (qty < 0 && cost) {
      const old = { ...pos }
      pos.qty -= Math.abs(qty)
      pos.cost = old.qty
        ? old.cost.mul(pos.qty / old.qty).withPrecision(2)
        : zero
    } else {
      if (qty) pos.qty += qty
      if (cost) pos.cost = pos.cost.add(cost).withPrecision(2)
    }
  }

  return pos.qty ? +pos.cost / pos.qty : 0
}

// -------------------------------------------------
//
// General read sheet into obejcts

async function readSheet (spreadsheetId, range, columnRow) {
  const cells = await _readSheet(spreadsheetId, range)
  const columns = cells[columnRow - 1]
  return cells.slice(columnRow).map(row =>
    Object.fromEntries(
      row
        .map((cell, ix) => (columns[ix] ? [columns[ix], cell] : null))
        .filter(Boolean)
        .filter(([k, v]) => v !== '')
    )
  )
}
