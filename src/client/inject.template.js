;(async () => {
  const server = '{{SERVER_ORIGIN}}'
  const { location } = window

  const state = await fetch(`${server}/status`).then(res => res.json())

  if (location.href !== state.url) return

  main()

  //
  // Main logic
  //
  async function main () {
    await isDomLoaded()

    const prices = scrapeIndexPrices()

    await postPrices(prices)
    window.stop()

    location.replace(`${state.origin}/?role=worker`)
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
    const url = `${server}/task/${id}`
    const body = JSON.stringify(prices)
    const method = 'POST'

    const res = await fetch(url, { method, body }).then(res => res.json())
    if (!res.ok) throw new Error('POST failed')
  }
})()
