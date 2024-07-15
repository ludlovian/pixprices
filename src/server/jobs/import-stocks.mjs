import { readSheet } from '@ludlovian/gsheet'
import Debug from '@ludlovian/debug'
import Job from '../model/job.mjs'
import { db } from '../db/index.mjs'
import config from '../config.mjs'

const debug = Debug('pixprices:import-stocks')

export default class ImportStocks extends Job {
  spreadsheetId
  range
  columns = 'ticker,name,incomeType,notes,currency,priceFactor'.split(',')

  constructor (schedule, data) {
    super(schedule, data)
    this.range = data.range
  }

  start (task) {
    this.run(task).catch(err => {
      console.error(err)
      task.failTask(err.message)
    })

    return {}
  }

  async run (task) {
    // read in the stocks sheet, and add in missing ones
    const stocks = await this.#readStocks()
    debug('Read %d stocks', stocks.length)
    updateStocks(stocks)

    const msg = `Imported ${stocks.length} stocks`
    task.completeTask(msg)
  }

  async #readStocks () {
    const cells = await readSheet(config.spreadsheetId, this.range)
    return cells
      .map(row => {
        const obj = {}
        for (let i = 0; i < this.columns.length; i++) {
          const key = this.columns[i]
          const val = row[i]
          if (key && val !== '') obj[key] = val
        }
        return obj
      })
      .filter(stock => stock.ticker)
  }
}

function updateStocks (stocks) {
  db.transaction(() => {
    db.run('startStocks')
    stocks.forEach(stock => {
      db.run('addStock', {
        ticker: stock.ticker,
        name: stock.name ?? null,
        incomeType: stock.incomeType ?? null,
        notes: stock.notes ?? null,
        currency: stock.currency ?? null,
        priceFactor: stock.priceFactor ?? null
      })
    })
    db.run('endStocks')
  })
}
