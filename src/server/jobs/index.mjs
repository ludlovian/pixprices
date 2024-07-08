import LseIndexPrices from './lse-index-prices.mjs'
import LseSharePrice from './lse-share-price.mjs'
import FetchDividends from './fetch-dividends.mjs'
import ImportPortfolio from './import-portfolio.mjs'
import jobs from './config.mjs'

function createJob (schedule, data) {
  switch (data.type) {
    case 'lse-index':
      return new LseIndexPrices(schedule, data)
    case 'lse-share':
      return new LseSharePrice(schedule, data)
    case 'dividends':
      return new FetchDividends(schedule, data)
    case 'import':
      return new ImportPortfolio(schedule, data)
  }
}

export function createJobs (schedule) {
  return jobs.map(data => createJob(schedule, data))
}
