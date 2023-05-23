import { hostname } from 'node:os'
import { argv } from 'node:process'
import { readFileSync } from 'node:fs'

import { parse } from '@lukeed/ms'

const isTest = argv.includes('test')

//
// HTTPS server
//

const server = (() => {
  const HOSTS = {
    client2: 'pixclient2.uk.to',
    pi1: 'pi1.local'
  }
  const host = HOSTS[hostname()]
  const port = 5234
  const origin = `https://${host}:${port}`
  const ssl = {
    key: readFileSync(`creds/${host}.key`),
    cert: readFileSync(`creds/${host}.crt`)
  }

  return { origin, port, ssl }
})()

//
// Browser clients
//

const client = {
  allowedOrigins: ['https://www.lse.co.uk']
}

//
// task handling
//

const task = {
  historyLength: 20,
  timeout: parse('5m')
}

//
// jobs
//

const jobs = (() => {
  const lseUrl = name =>
    ['https://www.lse.co.uk/share-prices/', name, '/constituents.html'].join('')

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

//
// prices spreadsheet
//

const prices = (() => {
  const tab = isTest ? 'Test' : 'Prices'

  return {
    id: '1UdNhJNLWriEJtAJdbxwswGTl8CBcDK1nkEmJvwbc_5c',
    range: rows => `${tab}!A2:E${rows ? rows + 1 : ''}`,
    credentials: 'creds/credentials.json',
    pruneAfter: parse('7d')
  }
})()

//
// Exports
//

export default { isTest, server, client, task, jobs, prices }
