import { parse as parseMs } from '@lukeed/ms'

import { isDev, sheetsOptions } from '../config.mjs'

// Debug prefix for tables

// Database config
export default {
  id: isDev
    ? '11py3fCC326GoQBbBIQpaqdLswk-C4MD059sB8z97044'
    : '1mmND8-BbQ6ld3TViPVSv_cxUiE8H4VRR9KRb61gPiGs',

  tables: {
    prices: 'Prices',
    dividends: 'Dividends',
    stocks: 'Stocks',
    positions: 'Positions',
    trades: 'Trades',
    metrics: 'Metrics'
  },

  options: sheetsOptions,

  pruneAfter: parseMs('30d'),
  recentUpdate: parseMs('1h')
}
