import Debug from '@ludlovian/debug'
import Parsley from 'parsley'

import prices from '../db/prices.mjs'

const debug = Debug('pixprices:lse-prices')

export default async function extractPrices (task, xml) {
  const { source, tableClass } = task

  const body = Parsley.from(xml, { safe: true, allowUnclosed: true })
  if (!body) throw new Error('Could not parse body')

  const table = body.find(
    ({ type, attr }) =>
      type === 'table' &&
      attr.class &&
      attr.class.split(' ').includes(tableClass)
  )
  if (!table) throw new Error('Could not find table')

  const updated = new Date()

  const changes = table
    .findAll('tr')
    .map(row => row.findAll('td').map(td => td.textAll.join('')))
    .map(([nameAndTicker, priceString]) => ({
      ...parseNameAndTicker(nameAndTicker),
      price: parsePrice(priceString),
      source,
      updated
    }))
    .filter(p => p.name && p.ticker && p.price != null)

  debug('Have parsed %d changes', changes.length)

  await prices.load()
  const count = prices.applyChanges(changes)
  prices.clearOld()

  await prices.save()

  const message = `Updated ${count.updated} skipped ${count.skipped} from ${task.job.name}`

  debug(message)
  return message
}

const rgxNameAndTicker = /^(.*) \((\w+)\.*\)$/
function parseNameAndTicker (nameAndTicker) {
  if (!nameAndTicker) return {}
  const m = rgxNameAndTicker.exec(nameAndTicker)
  return m ? { name: m[1], ticker: m[2] } : {}
}

const rgxPrice = /^[\d.,]+$/
function parsePrice (priceString) {
  if (!priceString || !rgxPrice.test(priceString)) return null
  return Number(priceString.replaceAll(',', ''))
}
