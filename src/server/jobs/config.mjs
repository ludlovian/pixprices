export default [
  {
    name: 'Price-AllShare',
    times: '09:40|13:40|16:40'.split('|').sort(),

    type: 'lse-prices',
    source: 'lse:AllShare',
    tableClass: 'sp-constituents__table',
    url:
      'https://www.lse.co.uk/share-prices/indices/ftse-all-share/constituents.html'
  },

  {
    name: 'Price-Aim',
    times: '09:42|13:42|16:42'.split('|').sort(),

    type: 'lse-prices',
    source: 'lse:Aim',
    tableClass: 'sp-constituents__table',
    url:
      'https://www.lse.co.uk/share-prices/indices/ftse-aim-all-share/constituents.html'
  },

  {
    name: 'Price-CEnd',
    times: '09:44|13:44|16:44'.split('|').sort(),

    type: 'lse-prices',
    source: 'lse:CEnd',
    tableClass: 'sp-constituents__table',
    url:
      'https://www.lse.co.uk/share-prices/sectors/closed-end-investments/constituents.html'
  },

  {
    name: 'Price-BrkSrv',
    times: '09:46|13:46|16:46'.split('|').sort(),

    type: 'lse-prices',
    source: 'lse:BrkSrv',
    tableClass: 'sp-constituents__table',
    url:
      'https://www.lse.co.uk/share-prices/sectors/brokerage-services/constituents.html'
  },

  {
    name: 'Import',
    times: '10:05|11:05|12:05|13:05|14:05|15:05|16:05|17:05'.split('|').sort(),

    type: 'import-portfolio',
    spreadsheet: '1fvIwUoLsLLnDQTAY4qgRmao50nQny-ad28t9j9xXJeA',
    positions: {
      sheet: 'Investments',
      range: 'A3:ZZ9999'
    },
    trades: {
      sheet: 'Trades',
      range: 'A2:H9999'
    }
  },

  {
    name: 'Export',
    times: '10:07|11:07|12:07|13:07|14:07|15:07|16:07|17:07'.split('|').sort(),

    type: 'export-database',
    exports: {
      vStocks: [
        {
          // Portfolio Analysis
          id: '1Fxaiw6ZjRCgmamBtE_QqtEhsw2ML2k57xUuEavJBBGY',
          sheet: 'Stocks'
        },

        {
          // Portfolio
          id: '1fvIwUoLsLLnDQTAY4qgRmao50nQny-ad28t9j9xXJeA',
          sheet: 'Stocks'
        },

        {
          // Independent Lady Portfolio
          id: '1KbDjUwHMHtYdk57L4vv6pnjyReNIi_vldKOtPuFlal4',
          sheet: 'Stocks'
        }
      ],

      vPositions: [
        {
          // Portfolio Analysis
          id: '1Fxaiw6ZjRCgmamBtE_QqtEhsw2ML2k57xUuEavJBBGY',
          sheet: 'Positions'
        }
      ]
    }
  }
]
