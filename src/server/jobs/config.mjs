export default [
  {
    type: 'lse-index',
    name: 'Price-AllShare',
    times: ['09:40', '16:40'],

    source: 'lse:AllShare',
    index: 'indices/ftse-all-share'
  },

  {
    type: 'lse-index',
    name: 'Price-Aim',
    times: ['09:42', '16:42'],

    source: 'lse:Aim',
    index: 'indices/ftse-aim-all-share'
  },

  {
    type: 'lse-index',
    name: 'Price-CEnd',
    times: ['09:44', '16:44'],

    source: 'lse:CEnd',
    index: 'sectors/closed-end-investments'
  },

  {
    type: 'lse-index',
    name: 'Price-BrkSrv',
    times: ['09:46', '16:46'],

    source: 'lse:BrkSrv',
    index: 'sectors/brokerage-services'
  },

  {
    type: 'lse-share',
    name: 'Price-HANA',
    times: ['09:47', '16:47'],

    source: 'lse:Share',
    query: 'shareprice=HANA&share=Hansa-Trust',
    ticker: 'HANA',
    stockName: "Hansa Trust 'A'"
  },

  {
    type: 'dividends',
    name: 'Dividends',
    times: ['09:30']
  },

  {
    type: 'import-portfolio',
    name: 'Import',
    times: [
      '10:05',
      '11:05',
      '12:05',
      '13:05',
      '14:05',
      '15:05',
      '16:05',
      '17:05'
    ],

    spreadsheetId: '1fvIwUoLsLLnDQTAY4qgRmao50nQny-ad28t9j9xXJeA',
    portfolioRange: 'Investments!A:ZZ',
    portfolioColumnRow: 3,
    tradesRange: 'Trades!A:H',
    tradesColumnRow: 2
  },

  {
    type: 'import-stocks',
    name: 'Stocks',
    times: [
      '10:06',
      '11:06',
      '12:06',
      '13:06',
      '14:06',
      '15:06',
      '16:06',
      '17:06'
    ],

    range: 'Stocks!A2:F'
  },

  {
    type: 'export',
    name: 'Export',
    times: [
      '10:07',
      '11:07',
      '12:07',
      '13:07',
      '14:07',
      '15:07',
      '16:07',
      '17:07'
    ],

    views: {
      vStock: 'vStocks',
      vPosition: 'vPositions',
      vDividend: 'vDividends'
    }
  }
]
