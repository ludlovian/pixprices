import Debug from '@ludlovian/debug'
import Parsley from '@ludlovian/parsley'
import Job from '../model/job.mjs'
import { db } from '../db/index.mjs'

const debug = Debug('pixprices:fetch-dividends')

const RX_TICKER = /^(?<ticker>\w+)\.*$/
const RX_DATE = /^\s*(?<day>\d+)-(?<month>\w+)\s*$/
const RX_DIV_CCY = /^(?<currency>€|\$)?(?<dividend>[\d.]+)(?<pence>p)?$/

export default class FetchDividends extends Job {
  url = 'https://www.dividenddata.co.uk/'
  source = 'dividenddata'

  start (task) {
    return { redirect: this.url }
  }

  async receiveData (task, { body: xml }) {
    const { source } = this
    const today = getToday()

    const body = Parsley.from(xml, { loose: true })
    if (!body) throw new Error('Could not parse body')

    const table = body.find('table')
    if (!table) throw new Error('Could not find table')

    const newDivs = table
      .find('tbody', { blank: true })
      .findAll('tr')
      // for each row, we gather all the text in the cells
      .map(row => row.findAll('td').map(td => td.textAll.join('').trim()))
      // we then extract the data
      .map(row => ({
        ...parse(row[0], RX_TICKER),
        ...parse(row[4], RX_DIV_CCY),
        date: makeDate(parse(row[8], RX_DATE)),
        declared: makeDate(parse(row[6], RX_DATE)),
        exdiv: makeDate(parse(row[7], RX_DATE)),
        source
      }))
      // only include vaild rows
      .filter(r => r.ticker && r.dividend && r.date && r.declared && r.exdiv)
      // adjust the currency
      .map(({ dividend, currency, pence, ...rest }) => {
        dividend = +dividend
        if (pence) {
          currency = 'GBP'
          dividend = dividend / 100
        } else if (currency === '$') {
          currency = 'USD'
        } else if (currency === '€') {
          currency = 'EUR'
        } else {
          currency = 'GBP'
        }
        return { ...rest, dividend, currency }
      })
      // adjust the dates
      .map(({ date, declared, exdiv, ...rest }) => {
        // The page shows future ex-div dates (or those happening today)
        // The order is always
        //    declared <= today <= ex-div <= payment
        //
        if (declared > today) declared = adjustYear(declared, -1)
        if (today > exdiv) exdiv = adjustYear(declared, 1)
        if (exdiv > date) date = adjustYear(date, 1)

        return { date, declared, exdiv, ...rest }
      })

    debug('Have parsed %d divs', newDivs.length)
    applyDivs(newDivs)

    const message = `Read ${newDivs.length} dividends`
    debug(message)
    task.completeTask(message)
  }
}

function applyDivs (changes) {
  db.transaction(() => {
    for (const chg of changes) {
      const { ticker, date, dividend, currency } = chg
      const { exdiv, declared, source } = chg
      const parms = {
        ...{ ticker, date, dividend, currency },
        ...{ exdiv, declared, source }
      }
      db.run('addDividend', parms)
    }
  })
}

function parse (data, rgx) {
  const match = rgx.exec(data)
  return match ? match.groups : {}
}

const monthLookup = Object.fromEntries(
  'jan,feb,mar,apr,may,jun,jul,aug,sep,oct,nov,dec'
    .split(',')
    .map((mon, i) => [mon, i + 1])
)

function adjustYear (dt, yrs) {
  const y = +dt.slice(0, 4)
  const m = +dt.slice(5, 2)
  const d = +dt.slice(8, 2)
  return formatYMD(y + yrs, m, d)
}

function getToday () {
  const d = new Date()
  return formatYMD(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function makeDate ({ day, month }) {
  const d = +day
  const m = monthLookup[month.toLowerCase()]
  const y = new Date().getFullYear()
  return d && m && y ? formatYMD(y, m, d) : ''
}

function formatYMD (y, m, d) {
  const dd = d.toString().padStart(2, '0')
  const mm = m.toString().padStart(2, '0')
  const yyyy = y.toString().padStart(4, '0')
  return `${yyyy}-${mm}-${dd}`
}
