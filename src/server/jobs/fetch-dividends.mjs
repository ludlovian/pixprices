import Debug from '@ludlovian/debug'
import Parsley from '@ludlovian/parsley'
import Job from '../model/job.mjs'
import database from '../db/index.mjs'

const debug = Debug('pixprices:fetch-dividends')

export default class FetchDividends extends Job {
  url = 'https://www.dividenddata.co.uk/'
  source = 'dividenddata'

  start (task) {
    return { redirect: this.url }
  }

  async receiveData (task, { body: xml }) {
    const { dividends } = database.tables
    const { source } = this

    const body = Parsley.from(xml, { loose: true })
    if (!body) throw new Error('Could not parse body')

    const table = body.find('table')
    if (!table) throw new Error('Could not find table')

    const updated = new Date()

    const newDivs = table
      .find('tbody', { blank: true })
      .findAll('tr')
      .map(row => row.findAll('td').map(td => td.textAll.join('').trim()))
      .map(row => {
        const ticker = cleanTicker(row[0])
        const [dividend, currency] = cleanDividend(row[4])
        const date = cleanDate(row[8], { after: updated })
        const declared = cleanDate(row[6], { before: date })
        const exdiv = cleanDate(row[7], { before: date })
        return {
          ticker,
          dividend,
          currency,
          declared,
          exdiv,
          date,
          source,
          updated
        }
      })
      .filter(d => d.ticker && d.dividend != null && d.date != null)

    debug('Have parsed %d divs', newDivs.length)

    await dividends.load()
    const count = applyDivs(dividends.data, newDivs)
    await dividends.save(clearOld(dividends.data))

    const message = `Updated ${count.updated} and added ${count.added} dividends`

    debug(message)
    task.completeTask(message)
  }
}

function applyDivs (divs, changes) {
  const count = { updated: 0, added: 0 }
  for (const change of changes) {
    const row = divs.find(
      d => +d.date === +change.date && d.ticker === change.ticker
    )
    if (row) {
      Object.assign(row, change)
      count.updated++
    } else {
      divs.push(change)
      count.added++
    }
  }
  return count
}

const months18 = 18 * 30 * 24 * 60 * 60 * 1000

function clearOld (divs) {
  const then = Date.now() - months18
  return divs.filter(d => d.updated > then)
}

function cleanTicker (ticker) {
  return ticker.replace(/\.+$/, '')
}

function cleanDividend (price) {
  const div = Number(price.replaceAll(/[^\d.]/g, ''))

  if (price.endsWith('p')) {
    return [div / 100, 'GBP']
  } else if (price.startsWith('$')) {
    return [div, 'USD']
  } else if (price.startsWith('€')) {
    return [div, 'EUR']
  } else {
    return []
  }
}

const rgxDate = /^\s*(\d+)-(\w+)\s*$/
const months = Object.fromEntries(
  'jan,feb,mar,apr,may,jun,jul,aug,sep,oct,nov,dec'
    .split(',')
    .map((mon, i) => [mon, i])
)

function cleanDate (dateString, { before, after }) {
  const match = rgxDate.exec(dateString)
  if (!match) return undefined
  const d = Number(match[1])
  const m = months[match[2].toLowerCase()]
  if (!d || m === undefined) return undefined
  const now = new Date()
  const y = now.getFullYear()
  let date = new Date(y, m, d)
  if (before) {
    while (date > before) {
      date = new Date(date.getFullYear() - 1, m, d)
    }
  } else if (after) {
    while (date < after) {
      date = new Date(date.getFullYear() + 1, m, d)
    }
  }
  return date
}
