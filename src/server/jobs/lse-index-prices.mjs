import { writeFileSync } from 'node:fs'
import Debug from '@ludlovian/debug'
import Parsley from '@ludlovian/parsley'
import Job from '../model/job.mjs'
import database from '../db/index.mjs'
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
    const { prices } = database.tables
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
    const count = applyPrices(prices.data, changes)

    await prices.save(clearOld(prices.data))
    const message = `Updated ${count.updated} skipped ${count.skipped} from ${task.job.name}`

    debug(message)
    task.completeTask(message)
  }
}

function applyPrices (prices, changes) {
  const recent = Date.now() - config.recentPriceUpdate
  const count = { updated: 0, skipped: 0 }

  for (const chg of changes) {
    const price = prices.find(p => p.ticker === chg.ticker)
    if (price) {
      if (price.updated > recent) {
        count.skipped++
      } else {
        Object.assign(price, chg)
        count.updated++
      }
    } else {
      prices.push(chg)
      count.updated++
    }
  }
  return count
}

function clearOld (prices) {
  const then = Date.now() - config.prunePriceAfter
  return prices.filter(p => +p.updated > then)
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
