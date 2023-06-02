import { parse as parseQS } from 'node:querystring'

import { effect } from '@preact/signals-core'
import send from '@polka/send-type'

import equal from 'pixutil/equal'
import { serialize, deserialize } from 'pixutil/json'
import Bouncer from 'bouncer'

import { $state, actions } from './model.mjs'
import { updatePriceSheet } from './sheet.mjs'
import config from './config.mjs'

export function getState (req, res) {
  send(res, 200, serialize($state.value))
}

export function getInjectState (req, res) {
  const { id, url, status } = $state.value.task
  const { isTest } = config
  const state = { id, url, status, isTest }
  send(res, 200, serialize(state))
}

export function getStateStream (req, res) {
  const role = req.search ? parseQS(req.search.slice(1)).role : undefined
  const prev = {}

  const removeClient = actions.addClient(role)

  res.writeHead(200, {
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream'
  })

  // The bouncer is used to throttle the server side events to one
  // every 250ms
  const bouncer = new Bouncer({ every: 250, fn: sendNewState })

  const unsub = effect(() => {
    // we don't actually use $state here, but we reference it
    // to ensure it gets called when the signal changes
    bouncer.fire($state.value)
  })

  req.on('close', () => {
    bouncer.stop()
    unsub()
    removeClient()
  })

  function sendNewState () {
    const curr = $state.value
    const diff = {}
    for (const k in curr) {
      if (!equal(curr[k], prev[k])) diff[k] = prev[k] = curr[k]
    }
    if (Object.keys(diff) === 0) return // no difference, so no send
    const data = JSON.stringify(serialize(diff))
    res.write(`data: ${data}\n\n`)
  }
}

export function requestTask (req, res) {
  const id = toNumber(req.params.id)
  if (id !== $state.value.task.id) return res.writeHead(404).end()

  actions.startTask(req, res)
}

export async function postPrices (req, res) {
  const id = toNumber(req.params.id)
  if (id !== $state.value.task.id) return res.writeHead(404).end()

  let statusCode = 200
  let retData

  try {
    const prices = deserialize(req.json)
    const source = $state.value.task.job

    await updatePriceSheet({ source: `lse:${source}`, prices })

    const message = `${prices.length} prices from ${source}`
    actions.completeTask(message)

    retData = { message, ok: true }
  } catch (err) {
    console.log(err)

    const { message } = err
    retData = { message, ok: false }
    statusCode = 503

    actions.failTask(message)
  }

  const s = JSON.stringify(serialize(retData))
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
