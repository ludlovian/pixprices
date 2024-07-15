import { writeFileSync } from 'node:fs'
import Debug from '@ludlovian/debug'
import Parsley from '@ludlovian/parsley'
import Job from '../model/job.mjs'
import { db } from '../db/index.mjs'

const debug = Debug('pixprices:lse-prices')
const XX = false

const PRICE_CLASS = 'sp-main-info__primary-data--price'

export default class LseSharePrice extends Job {
  #baseUrl = 'https://www.lse.co.uk/SharePrice.html'

  query
  ticker
  stockName
  source

  constructor (schedule, data) {
    super(schedule, data)
    this.query = data.query
    this.ticker = data.ticker
    this.stockName = data.stockName
    this.source = data.source
  }

  get url () {
    return `${this.#baseUrl}?${this.query}`
  }

  start (task) {
    return { redirect: this.url }
  }

  async receiveData (task, { body: xml }) {
    if (XX && debug.enabled) writeFileSync('received.xml', xml)
    const { source, ticker, name } = this

    const body = Parsley.from(xml, { loose: true })
    if (!body) throw new Error('Could not parse body')

    const priceElem = body.find(
      e =>
        e.type === 'div' &&
        e.attr.class &&
        e.attr.class.split(' ').includes(PRICE_CLASS)
    )

    if (!priceElem) throw new Error('Could not find price div')

    const span = priceElem.find(e => e.type === 'span' && e.attr['data-item'])
    if (!span) throw new Error('Could not find price span')

    const valText = span.text
    const price = +valText
    if (isNaN(price)) throw new Error(`Price "${valText}" is not a number`)

    applyPrice({ ticker, name, source, price })

    const message = `Fetched price for ${ticker}`

    debug(message)
    task.completeTask(message)
  }
}

function applyPrice ({ ticker, name, source, price }) {
  db.run('addPrice', { ticker, name, price, source, recent: null })
}
