import Debug from '@ludlovian/debug'
import * as sheets from 'googlejs/sheets'

import stocks from '../db/stocks.mjs'
import metrics from '../db/metrics.mjs'
import positions from '../db/positions.mjs'
import trades from '../db/trades.mjs'
import prices from '../db/prices.mjs'
import { rowToObject, emptyStringToUndef } from '../db/util.mjs'

import { sheetsOptions } from '../config.mjs'

const debug = Debug('pixprices:import-portfolio')
const { entries } = Object

export default async function importPortfolio (task) {
  const pos = await importPositionsAndMetrics(task)
  if (positions.isStale()) await positions.load()
  debug('Imported %d positions', pos.positions.length)
  positions.replace(pos.positions)
  positions.save()

  if (metrics.isStale()) await metrics.load()
  debug('Imported %d metrics', pos.metrics.length)
  metrics.replace(pos.metrics)
  metrics.save()

  const newTrades = await importTrades(task)
  if (trades.isStale()) await trades.load()
  trades.replaceFromSheetTrades(newTrades)
  trades.save()

  await checkMissingStocks()

  const msg = `Imported ${positions.data.length} positions and ${trades.data.length} trades`
  debug(msg)

  return msg
}

async function importPositionsAndMetrics (task) {
  const data = await readPortfolioSheet(task)
  const positions = []
  const metrics = []
  for (const row of data) {
    positions.push(...readPositions(row))

    const { ticker, nav, eps, div } = row
    if (nav || eps || div) metrics.push({ ticker, dividend: div, nav, eps })
  }
  return { positions, metrics }
}

function readPositions (row) {
  const result = []
  const { ticker } = row
  for (const [name, qty] of entries(row)) {
    if (!name.includes(':') || !qty) continue
    const [account, who] = name.split(':')
    result.push({ ticker, account, who, qty })
  }
  return result
}

async function readPortfolioSheet (task) {
  const rawData = await sheets.getRange({
    sheet: task.spreadsheet,
    range: `${task.positions.sheet}!${task.positions.range}`,
    scopes: sheets.scopes.rw,
    ...sheetsOptions
  })

  const cols = rawData.shift()
  const data = rawData
    .slice(task.positions.indexRow)
    .map(row => rowToObject(row, cols))
    .filter(({ ticker }) => !!ticker)
    .map(emptyStringToUndef)

  return data
}

async function importTrades (task) {
  const rawData = await sheets.getRange({
    sheet: task.spreadsheet,
    range: `${task.trades.sheet}!${task.trades.range}`,
    scopes: sheets.scopes.rw,
    ...sheetsOptions
  })

  const cols = rawData.shift()
  const data = rawData
    .map(row => rowToObject(row, cols))
    .filter(row => !!row.ticker.trim())
    .map(emptyStringToUndef)
    .map(trade => ({ ...trade, date: sheets.toDate(trade.date) }))

  return data
}

async function checkMissingStocks () {
  if (stocks.isStale()) await stocks.load()
  // find all the tickers in use
  const tickers = new Set(trades.data.map(t => t.ticker))
  // and ignore all the ones we already have
  stocks.data.forEach(s => tickers.delete(s.ticker))

  // bail out if there are none missing
  if (!tickers.size) return

  // so we need new ones - let's get the names from prices if we have them
  if (prices.isStale()) await prices.load()
  for (const ticker of tickers) {
    const price = prices.data.find(p => p.ticker === ticker)
    const name = price?.name
    stocks.addNew({ ticker, name })
  }
  debug('Added tickers: %s', [...tickers].join(','))
  await stocks.save()
}
