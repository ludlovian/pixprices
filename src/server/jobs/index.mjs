import extractPrices from './lse-fetch-prices.mjs'
import importPortfolio from './import-portfolio.mjs'
import exportDatabase from './export-database.mjs'

export function startTask (task) {
  switch (task.type) {
    case 'lse-prices':
      return task.url
    case 'import-portfolio':
      importPortfolio(task).then(
        msg => task.complete(msg),
        err => task.fail(err.message)
      )
      return '/?role=worker'
    case 'export-database':
      exportDatabase(task).then(
        msg => task.complete(msg),
        err => task.fail(err.message)
      )
      return '/?role=worker'
    default:
      throw new Error(`No such task type: ${task.type}`)
  }
}

export function completeTask (task, data) {
  switch (task.type) {
    case 'lse-prices':
      return extractPrices(task, data.body)
    default:
      throw new Error(`No such task type: ${task.type}`)
  }
}
