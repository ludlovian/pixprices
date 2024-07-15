import assert from 'node:assert'
import LseIndexPrices from './lse-index-prices.mjs'
import LseSharePrice from './lse-share-price.mjs'
import FetchDividends from './fetch-dividends.mjs'
import ImportPortfolio from './import-portfolio.mjs'
import ImportStocks from './import-stocks.mjs'
import ExportData from './export.mjs'
import jobs from './config.mjs'

const JOBS = {
  'lse-index': LseIndexPrices,
  'lse-share': LseSharePrice,
  dividends: FetchDividends,
  'import-portfolio': ImportPortfolio,
  'import-stocks': ImportStocks,
  export: ExportData
}

function createJob (schedule, data) {
  const Factory = JOBS[data.type]
  assert(Factory)
  return new Factory(schedule, data)
}

export function createJobs (schedule) {
  return jobs.map(data => createJob(schedule, data))
}
