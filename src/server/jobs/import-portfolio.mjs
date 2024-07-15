import Debug from '@ludlovian/debug'
import { readSheet } from '@ludlovian/gsheet'
import Job from '../model/job.mjs'
import decimal from '@ludlovian/decimal'
import { db } from '../db/index.mjs'

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
    const imported = await this.#importPositionsAndMetrics()

    updatePositions(imported.positions)
    updateMetrics(imported.metrics)

    const tradesData = await this.#importTrades()
    updateTrades(tradesData)

    const msg =
      `Imported ${imported.positions.length} positions ` +
      `and ${tradesData.length} trades`
    task.completeTask(msg)
  }

  async #importPositionsAndMetrics () {
    const data = (
      await readSheetIntoObjects(
        this.spreadsheetId,
        this.portfolioRange,
        this.portfolioColumnRow
      )
    ).filter(({ ticker }) => !!ticker)

    debug('Loaded %d rows from Investments', data.length)

    return {
      positions: processPositions(data),
      metrics: processMetrics(data)
    }
  }

  async #importTrades () {
    const data = (
      await readSheetIntoObjects(
        this.spreadsheetId,
        this.tradesRange,
        this.tradesColumnRow
      )
    ).filter(({ ticker }) => !!ticker)

    debug('Loaded %d rows from Trades', data.length)

    return processTrades(data)
  }
}

// -------------------------------------------------
//
// Reading the portfolio sheet
//

// Extracting the position objects from the spreadsheet rows
//

function processPositions (data) {
  // the positions are in rows with headings 'account:who'
  return (
    data
      .map(row => {
        const positions = []
        const { ticker } = row
        for (const name of Object.keys(row)) {
          if (name.includes(':')) {
            const [account, who] = name.split(':')
            const qty = row[name]
            positions.push({ ticker, account, who, qty })
          }
        }

        return positions
      })
      // and then flat to make a single arrat
      .flat()
  )
}

// Metrics
//
// Extracted from the sheet, only if we have some

function processMetrics (data) {
  return (
    data
      // only where we have a metric
      .filter(({ nav, eps, div }) => nav || eps || div)
      // extract only those items, renaming div to dividend
      .map(({ ticker, nav, eps, div }) => ({
        ...{ ticker, nav, eps },
        dividend: div
      }))
  )
}

// -------------------------------------------------
//
// Reading the trades sheet
//
// Including the calculation of gains

function processTrades (data) {
  const zero = decimal('0.00')

  // to calculate gains, we store the previous trade by position
  const posByKey = new Map()
  const getPos = key =>
    posByKey.get(key) ?? posByKey.set(key, { qty: 0, cost: zero }).get(key)

  // Each trade is given a trade id (which is also the rowid)
  let tradeId = 1

  // sheet trades has a "cost" column which is actually:
  // - cost adjustment for everything other than a sale
  // - negative proceeds for a sale

  return (
    data
      // we only process rows with a valid ticker/account/who, date
      // and at least one of qty or cost
      .filter(
        ({ ticker, account, who, date, qty, cost }) =>
          ticker && account && who && date && (qty || cost)
      )
      // Now we process each trade in turn
      .map(row => {
        const { ticker, account, who } = row
        const { qty, cost } = row
        const key = [ticker, account, who].join(':')
        const pos = getPos(key)

        row.tradeId = tradeId++

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
  )
}

// -------------------------------------------------
//
// General read sheet into obejcts

async function readSheetIntoObjects (spreadsheetId, range, columnRow) {
  const cells = await readSheet(spreadsheetId, range)
  const columns = cells[columnRow - 1]
  return (
    cells
      // get rid of rows up to & including the column row
      .slice(columnRow)
      .map(row => {
        const obj = {}
        for (let i = 0; i < columns.length; i++) {
          const key = columns[i]
          const val = row[i]
          if (key && val !== '') obj[key] = val
        }
        return obj
      })
  )
}

// -------------------------------------------------
//
// Updating the database
//

function updatePositions (data) {
  db.transaction(() => {
    db.run('startPositions')
    data.forEach(pos => {
      const { ticker, account, who, qty } = pos
      db.run('addPosition', { ticker, account, who, qty })
    })
    db.run('endPositions')
  })
}

function updateMetrics (data) {
  db.transaction(() => {
    db.run('startMetrics')
    data.forEach(row => {
      const { ticker, nav, dividend, eps } = row
      db.run('addMetric', {
        ticker,
        nav: nav ?? null,
        dividend: dividend ?? null,
        eps: eps ?? null
      })
    })
    db.run('endMetrics')
  })
}

function updateTrades (data) {
  db.transaction(() => {
    db.run('startTrades')
    data.forEach(trade => {
      const { tradeId, ticker, account, who, date } = trade
      const { qty, cost, gain, proceeds, notes } = trade
      db.run('addTrade', {
        tradeId,
        ticker,
        account,
        who,
        date,
        qty: qty ?? null,
        cost: cost?.toNumber() ?? null,
        gain: gain?.toNumber() ?? null,
        proceeds: proceeds?.toNumber() ?? null,
        notes
      })
    })
    db.run('endTrades')
  })
}
