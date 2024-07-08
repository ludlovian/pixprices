import os from 'node:os'
import { resolve } from 'node:path'
import configure from '@ludlovian/configure'

export default configure('PIXPRICES_', {
  isDev: process.env.NODE_ENV !== 'production',

  // client path files
  clientPath: resolve('dist/public'),

  // server details
  hostname: os.hostname(),
  serverPort: 5234,
  fullHostname: c => `${c.hostname}.pix.uk.to`,
  origin: c => `https://${c.fullHostname}:${c.serverPort}`,
  sslCredsDir: 'creds',

  // permitted clients
  allowedOrigins: ['https://www.lse.co.uk', 'https://www.dividenddata.co.uk'],

  // SSE heartbeat
  heartbeatPeriod: '30s',

  // task management
  taskTimeout: '5m',
  taskHistoryLength: 20,

  // Database sheet
  spreadsheetId: c =>
    c.isDev
      ? '11py3fCC326GoQBbBIQpaqdLswk-C4MD059sB8z97044'
      : '1mmND8-BbQ6ld3TViPVSv_cxUiE8H4VRR9KRb61gPiGs',

  // Price configs
  recentPriceUpdate: '60m',
  prunePriceAfter: '30d',

  // SQLite database
  portfolioDB: resolve('db/portfolio.db'),
  auditDB: resolve('db/audit.db')
})
