import Debug from '@ludlovian/debug'
import Job from '../model/job.mjs'
import { readSheet as _readSheet } from '@ludlovian/sheetdb'
import decimal from '@ludlovian/decimal'
import { sheetdb } from '../db/index.mjs'
import { xl2js } from '../dates.mjs'

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
    const { positions, metrics, trades } = sheetdb.tables

    const imported = await this.#importPositionsAndMetrics()

    await this.#updatePositions(positions, imported.positions)
    await this.#updateMetrics(metrics, imported.metrics)

    const tradesData = await this.#importTrades()
    await this.#updateTrades(trades, tradesData)

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

  async #updatePositions (table, data) {
    debug('Imported %d positions', data.length)
    await table.load()
    data.forEach(item => {
      const { ticker, account, who, qty } = item
      table.get({ ticker, account, who }).set({ qty })
    })
    ;[...table.rows.untouched].forEach(row => row.delete())
    debug(
      'Adds: %d, Changes: %d, Deletes: %d',
      table.rows.added.size,
      table.rows.changed.size,
      table.rows.deleted.size
    )
    await table.save()
  }

  async #updateMetrics (table, data) {
    debug('Imported %d metrics', data.length)
    await table.load()
    data.forEach(item => {
      const { ticker, nav, dividend, eps } = item
      table.get({ ticker }).set({ nav, dividend, eps })
    })
    ;[...table.rows.untouched].forEach(row => row.delete())
    debug(
      'Adds: %d, Changes: %d, Deletes: %d',
      table.rows.added.size,
      table.rows.changed.size,
      table.rows.deleted.size
    )
    await table.save()
  }

  async #updateTrades (table, data) {
    debug('Imported %d trades', data.length)
    await table.load()

    data.forEach(item => {
      const { rowid, ...rest } = item
      table.get({ rowid }).set(rest)
    })
    ;[...table.rows.untouched].forEach(row => row.delete())
    debug(
      'Adds: %d, Changes: %d, Deletes: %d',
      table.rows.added.size,
      table.rows.changed.size,
      table.rows.deleted.size
    )
    await table.save()
  }

  async #importTrades () {
    const data = (
      await readSheet(
        this.spreadsheetId,
        this.tradesRange,
        this.tradesColumnRow
      )
    ).filter(({ ticker }) => !!ticker)

    return readTrades(data)
  }

  async #checkMissingStocks () {
    const { stocks, prices, trades } = sheetdb.tables
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
      const stock = stocks.get({ ticker })
      const name = prices.data.find(p => p.ticker === ticker)?.name
      const notes = 'Automatically Added'
      const currency = 'GBP'
      const priceFactor = 100
      stock.update({ name, notes, currency, priceFactor })
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
  const zero = decimal('0.00')

  // to calculate gains, we store the previous trade by position
  const posByKey = new Map()
  const getPos = key =>
    posByKey.get(key) ?? posByKey.set(key, { qty: 0, cost: zero }).get(key)

  // Each trade is given a trade id (which is also the rowid)
  let rowid = 1

  // sheet trades has a "cost" column which is actually:
  // - cost adjustment for everything other than a sale
  // - negative proceeds for a sale

  return data.map(row => {
    const { ticker, account, who } = row
    const { qty, cost } = row
    const key = [ticker, account, who].join(':')
    const pos = getPos(key)

    row.rowid = rowid++
    if (row.date) row.date = xl2js(row.date)

    // Is it a sell
    if (qty < 0 && cost) {
      const old = { ...pos }

      // cost column is (negative) proceeds
      row.proceeds = decimal(Math.abs(cost)).withPrecision(2)

      // Update the running position
      pos.qty -= Math.abs(qty)
      // new cost is a proportionate reduction
      pos.cost = old.qty
        ? old.cost.mul(pos.qty / old.qty).withPrecision(2)
        : zero

      const origCostOfSoldItems = old.cost.sub(pos.cost)

      // the reduction in cost basis
      row.cost = origCostOfSoldItems.neg()

      // the gain made
      row.gain = row.proceeds.sub(origCostOfSoldItems)
    } else {
      if (cost !== undefined) {
        row.cost = decimal(row.cost).withPrecision(2)
      }

      row.proceeds = row.gain = undefined
      // update running position
      if (qty) pos.qty += qty
      if (cost) pos.cost = pos.cost.add(cost).withPrecision(2)
    }
    return row
  })
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
