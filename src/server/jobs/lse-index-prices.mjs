import { writeFileSync } from 'node:fs'
import Debug from '@ludlovian/debug'
import Parsley from '@ludlovian/parsley'
import Job from '../model/job.mjs'
import { db } from '../db/index.mjs'
import config from '../config.mjs'

const debug = Debug('pixprices:lse-prices')
const XX = false

const TABLE_CLASS = 'sp-constituents__table'
const RX_NAME_TICKER = /^(?<name>.*) \((?<ticker>\w+)\.*\)$/
const RX_PRICE = /^(?<price>[\d.,]+)$/

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
    const source = this.source

    const body = Parsley.from(xml, { loose: true })
    if (!body) throw new Error('Could not parse body')

    const table = body.find(
      ({ type, attr }) =>
        type === 'table' &&
        attr.class &&
        attr.class.split(' ').includes(TABLE_CLASS)
    )
    if (!table) throw new Error('Could not find table')

    const changes = table
      .findAll('tr')
      .map(
        // for each row of the table
        row =>
          row
            // we find each cell
            .findAll('td')
            .map(
              // and grab, combine & trim the text
              td => td.textAll.join('').trim()
            )
      )
      // Then we parse the texts into object properties
      .map(cols => ({
        ...parse(cols[0], RX_NAME_TICKER),
        ...parse(cols[1], RX_PRICE),
        source
      }))
      // Only where we've got stuff
      .filter(p => p.name && p.ticker && p.price !== undefined)
      .map(({ price, ...rest }) => ({
        ...rest,
        // Convert price from string to number
        price: +price.replaceAll(',', '')
      }))

    debug('Have parsed %d changes', changes.length)

    applyPrices(changes)

    const message = `Read ${changes.length} prices from ${task.job.name}`

    debug(message)
    task.completeTask(message)
  }
}

function applyPrices (changes) {
  db.transaction(() => {
    const recent = config.recentPriceUpdate

    for (const chg of changes) {
      const { ticker, name, price, source } = chg
      db.run('addPrice', { ticker, name, price, source, recent })
    }

    const period = config.prunePriceAfter
    db.run('prunePrice', { period })
  })
}

function parse (data, rgx) {
  const match = rgx.exec(data)
  return match ? match.groups : {}
}
