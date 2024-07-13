import { writeFileSync } from 'node:fs'
import Debug from '@ludlovian/debug'
import Parsley from '@ludlovian/parsley'
import Job from '../model/job.mjs'
import { sheetdb } from '../db/index.mjs'
import config from '../config.mjs'

const debug = Debug('pixprices:lse-prices')
const XX = false

export default class LseIndexPrices extends Job {
  #url = 'https://www.lse.co.uk/share-prices/{{INDEX}}/constituents.html'
  index
  source

  constructor (schedule, data) {
    super(schedule, data)
    this.index = data.index
    this.source = data.source
  }

  get url () {
    return this.#url.replace('{{INDEX}}', this.index)
  }

  start (task) {
    return { redirect: this.url }
  }

  async receiveData (task, { body: xml }) {
    if (XX) writeFileSync('received.xml', xml)
    const { prices } = sheetdb.tables
    const updated = new Date()
    const source = this.source

    const body = Parsley.from(xml, { loose: true })
    if (!body) throw new Error('Could not parse body')

    const table = body.find(
      ({ type, attr }) =>
        type === 'table' &&
        attr.class &&
        attr.class.split(' ').includes('sp-constituents__table')
    )
    if (!table) throw new Error('Could not find table')

    const changes = table
      .findAll('tr')
      .map(row => row.findAll('td').map(td => td.textAll.join('').trim()))
      .map(([nameAndTicker, priceString]) => ({
        ...parseNameAndTicker(nameAndTicker),
        price: parsePrice(priceString),
        source,
        updated
      }))
      .filter(p => p.name && p.ticker && p.price != null)

    debug('Have parsed %d changes', changes.length)

    await prices.load()
    const count = applyPrices(prices, changes)

    await prices.save()
    const message = `Updated ${count.updated} skipped ${count.skipped} from ${task.job.name}`

    debug(message)
    task.completeTask(message)
  }
}

function applyPrices (prices, changes) {
  const recent = Date.now() - config.recentPriceUpdate
  const then = Date.now() - config.prunePriceAfter

  for (const chg of changes) {
    const { ticker, name, price, source, updated } = chg
    const row = prices.get({ ticker })
    if (row.updated < recent) {
      row.set({ name, price, source, updated })
    }
  }

  for (const row of prices.data) {
    if (row.updated < then) row.delete()
  }

  const updated = prices.rows.added.size + prices.rows.changed.size
  const skipped = changes.length - updated
  return { updated, skipped }
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
