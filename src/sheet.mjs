import * as sheets from 'googlejs/sheets'

import createSerial from 'pixutil/serial'

import config from './config.mjs'

const serial = createSerial()

async function loadPrices () {
  const { id, range, credentials } = config.prices

  const data = await sheets.getRange({
    sheet: id,
    range: range(),
    scopes: sheets.scopes.rw,
    credentials
  })

  const priceMap = new Map()

  for (const row of data) {
    const [ticker, name, price, source, updatedSerial] = row
    const updated = sheets.toDate(updatedSerial)
    priceMap.set(ticker, { ticker, name, price, source, updated })
  }

  return priceMap
}

async function writePrices (priceMap, prevSize = 0) {
  const { id, range, credentials } = config.prices

  const data = Array.from(priceMap.keys())
    .sort()
    .map(ticker => priceMap.get(ticker))
    .map(({ ticker, name, price, source, updated }) => [
      ticker,
      name,
      price,
      source,
      updated
    ])

  while (data.length < prevSize) {
    data.push(Array.from({ length: 5 }).map(() => ''))
  }

  await sheets.updateRange({
    sheet: id,
    range: range(data.length),
    data,
    scopes: sheets.scopes.rw,
    credentials
  })
}

function pruneOldPrices (priceMap, pruneAfter) {
  const threshhold = new Date(Date.now() - pruneAfter)
  Array.from(priceMap.entries())
    .filter(([_, { updated }]) => updated < threshhold)
    .forEach(([ticker]) => priceMap.delete(ticker))
}

export function updatePriceSheet ({ source, prices }) {
  return serial.exec(async () => {
    // if (config.isTest) {
    //   log(`TEST: received ${prices.length} prices from ${source}`)
    //   return
    // }
    const updated = new Date()

    const priceMap = await loadPrices()
    const prevSize = priceMap.size

    for (const { ticker, name, price } of prices) {
      priceMap.set(ticker, { ticker, name, price, source, updated })
    }

    pruneOldPrices(priceMap, config.prices.pruneAfter)

    await writePrices(priceMap, prevSize)
  })
}
