import Debug from '@ludlovian/debug'
import Parsley from 'parsley'

import dividends from '../db/dividends.mjs'

const debug = Debug('pixprices:fetch-dividends')

export default async function extractDividends (task, xml) {
  const { source } = task

  const body = Parsley.from(xml, { safe: true, allowUnclosed: true })
  if (!body) throw new Error('Could not parse body')

  const table = body.find('table')
  if (!table) throw new Error('Could not find table')

  const updated = new Date()

  const divs = table
    .find('tbody', { blank: true })
    .findAll('tr')
    .map(row => row.findAll('td').map(td => td.textAll.join('').trim()))
    .map(row => {
      const ticker = cleanTicker(row[0])
      const [div, ccy] = cleanDividend(row[4])
      const declared = cleanDate(row[6], { before: true })
      const exdiv = cleanDate(row[7], { after: true })
      const date = cleanDate(row[8], { after: true })
      return { ticker, div, ccy, declared, exdiv, date, source, updated }
    })
    .filter(d => d.ticker && d.div != null && d.date != null)

  debug('Have parsed %d divs', divs.length)

  await dividends.load()
  const count = dividends.apply(divs)
  dividends.clearOld()

  await dividends.save()

  const message = `Updated ${count.updated} from ${task.job.name}`

  debug(message)
  return message
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
  if (before && date > now) {
    date = new Date(y - 1, m, d)
  } else if (after && date < now) {
    date = new Date(y + 1, m, d)
  }
  return date
}
