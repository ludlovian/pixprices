import { parse as parseQS } from 'node:querystring'

import Debug from '@ludlovian/debug'

import model from './model/index.mjs'
import { updatePriceSheet } from './sheet.mjs'
import { isDev } from './config.mjs'

const debug = Debug('pixprices:server')

export function getState (req, res) {
  debug('getState')
  const s = JSON.stringify(model.state)
  res
    .writeHead(200, {
      'Content-Type': 'application/json;charset=utf-8',
      'Content-Length': Buffer.byteLength(s)
    })
    .end(s)
}

export function getInjectState (req, res) {
  debug('getInjectState')
  const { id, url, status } = model.task
  const s = JSON.stringify({ id, url, status, isDev })
  res
    .writeHead(200, {
      'Content-Type': 'application/json;charset=utf-8',
      'Content-Length': Buffer.byteLength(s)
    })
    .end(s)
}

export function getStateStream (req, res) {
  debug('getStateStream')
  let role = 'watcher'
  const { search } = req
  if (search && parseQS(search.slice(1)).role === 'worker') role = 'worker'
  res.writeHead(200, {
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream'
  })

  const cancel = model.listen(role, diff => {
    const data = JSON.stringify(diff)
    res.write(`data: ${data}\n\n`)
  })

  req.on('close', cancel)
}

export function requestTask (req, res) {
  debug('requestTask %o', req.params)
  const id = toNumber(req.params.id)
  if (id !== model.task.id) return res.writeHead(404).end()

  model.task.start()

  res
    .writeHead(302, {
      Location: model.task.url,
      'Content-Length': 0
    })
    .end()
}

export async function postPrices (req, res) {
  const id = toNumber(req.params.id)
  if (id !== model.task.id) return res.writeHead(404).end()
  debug('postPrices')

  let statusCode = 200
  let retData

  try {
    const prices = req.json
    const source = model.task.job

    await updatePriceSheet({ source: `lse:${source}`, prices })

    const message = `${prices.length} prices from ${source}`
    model.task.complete(message)
    retData = { message, ok: true }
  } catch (err) {
    debug('Failed: %O', err)
    const { message } = err
    retData = { message, ok: false }
    statusCode = 503

    model.task.fail(message)
  }

  const s = JSON.stringify(retData)
  res
    .writeHead(statusCode, {
      'Content-Type': 'application/json;charset=utf-8',
      'Content-Length': Buffer.byteLength(s)
    })
    .end(s)
}

function toNumber (s) {
  const v = parseInt(s || '0')
  return Number.isNaN(v) ? 0 : v
}
