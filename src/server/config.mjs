import os from 'node:os'
import { readFileSync } from 'node:fs'

import { parse as parseMs } from '@lukeed/ms'

// are we running in dev or production
export const isDev = process.env.NODE_ENV !== 'production'

// Where are the client files
export const clientPath = './dist/public'

// Name of the server
export const hostname = os.hostname()
export const fqdn = hostname + '.pix.uk.to'

// Settings for the HTTP server
export const serverPort = 5234
export const serverSSL = {
  key: readFileSync(`creds/${fqdn}.key`),
  cert: readFileSync(`creds/${fqdn}.crt`)
}

// Server origin
export const origin = `https://${hostname}.pix.uk.to:${serverPort}`

// Client settings
export const allowedOrigins = ['https://www.lse.co.uk']

// Task settings

export const taskHistoryLength = 20
export const taskTimeout = parseMs('5m')
export const taskLookback = parseMs('1d')
export const jobs = (() => {
  const lseUrl = name =>
    'https://www.lse.co.uk/share-prices/' + name + '/constituents.html'
  return [
    {
      job: 'AllShare',
      url: lseUrl('indices/ftse-all-share'),
      times: '09:40|13:40|16:40'.split('|').sort()
    },
    {
      job: 'Aim',
      url: lseUrl('indices/ftse-aim-all-share'),
      times: '09:45|13:45|16:45'.split('|').sort()
    },
    {
      job: 'CEnd',
      url: lseUrl('sectors/closed-end-investments'),
      times: '09:50|13:50|16:50'.split('|').sort()
    }
  ]
})()

// Price store

export const priceStore = {
  id: '1UdNhJNLWriEJtAJdbxwswGTl8CBcDK1nkEmJvwbc_5c',
  range: rows => `${isDev ? 'Test' : 'Prices'}!A2:E${rows ? rows + 1 : ''}`,
  credentials: 'creds/credentials.json',
  pruneAfter: parseMs('7d')
}
