;(async () => {
  const server = 'https://client2.pix.uk.to:5234'
  const { location } = window
  console.log('PixPrices js injected.')

  const state = await fetch(`${server}/api/status/inject`).then(res =>
    res.json()
  )

  if (location.href !== state.url) {
    console.log(`Not on ${state.url}\nSkipping.`)
    return
  }

  main()

  //
  // Main logic
  //
  async function main () {
    await isDomLoaded()

    const prices = scrapeIndexPrices()

    await postPrices(prices)
    window.stop()

    if (state.isTest) {
      console.log('Prices posted. Waiting to return.')
      await new Promise(resolve => setTimeout(resolve, 10 * 1000))
    }

    location.replace(`${server}/?role=worker`)
  }

  //
  // Page loading
  //

  function isDomLoaded () {
    return new Promise(resolve => {
      const okStates = ['interactive', 'complete']
      const ready = () => okStates.includes(document.readyState)
      if (ready()) return resolve()
      document.addEventListener('readystatechange', () => ready() && resolve())
    })
  }

  //
  // Scraping
  //

  function scrapeIndexPrices () {
    const tableSelector = [
      'table.sp-constituents__table',
      'table.sp-sectors__table'
    ].join(',')

    const rgxNameAndTicker = /^(.*) \((\w+)\.*\)$/
    const rgxNumber = /^[\d.,]+$/

    const table = document.querySelector(tableSelector)
    if (!table) throw new Error('Could not find table')

    return getRowsFromTable(table)
      .map(extractPriceFromRow)
      .filter(Boolean)

    function getRowsFromTable (table) {
      return [...table.querySelectorAll('tr')]
    }

    function extractPriceFromRow (row) {
      const [nameTicker, priceString] = getCellsFromRow(row)
      const [name, ticker] = readNameAndTicker(nameTicker)
      const price = readPrice(priceString)
      return name && ticker && price != null ? { name, ticker, price } : null
    }

    function getCellsFromRow (row) {
      return [...row.querySelectorAll('td')].map(td => td.textContent)
    }

    function readNameAndTicker (txt) {
      if (!txt) return []
      const m = rgxNameAndTicker.exec(txt)
      return m ? [m[1], m[2]] : []
    }

    function readPrice (txt) {
      return txt && rgxNumber.test(txt) ? Number(txt.replaceAll(',', '')) : null
    }
  }

  async function postPrices (prices) {
    const { id } = state
    const url = `${server}/api/task/${id}`
    const body = JSON.stringify(prices)
    const method = 'POST'

    const res = await fetch(url, { method, body }).then(res => res.json())
    if (!res.ok) throw new Error('POST failed')
  }
})()
