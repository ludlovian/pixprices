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
export const allowedOrigins = [
  'https://www.lse.co.uk',
  'https://www.dividenddata.co.uk'
]

// Task settings

export const taskHistoryLength = 20
export const taskTimeout = parseMs('5m')
export const taskLookback = parseMs('1d')

// Price store

export const sheetsOptions = {
  credentials: 'creds/credentials.json'
}
