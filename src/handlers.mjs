import { effect } from '@preact/signals-core'

import equal from 'pixutil/equal'

import { $state, startTask, completeTask, failTask } from './model.mjs'
import { updatePriceSheet } from './sheet.mjs'
import { serialize, deserialize } from './util.mjs'

export function getStateStream (req, res) {
  const prev = {}

  res.writeHead(200, {
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream'
  })

  const unsub = effect(sendNewState)
  req.on('close', unsub)

  function sendNewState () {
    const curr = $state.value
    const diff = {}
    for (const k in curr) {
      if (!equal(curr[k], prev[k])) diff[k] = prev[k] = curr[k]
    }
    const data = JSON.stringify(serialize(diff))
    res.write(`data: ${data}\n\n`)
  }
}

export function requestTask (req, res) {
  const id = toNumber(req.params.id)
  if (id !== $state.value.task.id) return res.writeHead(404).end()

  startTask(req, res)
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
    completeTask(message)

    retData = { message, ok: true }
  } catch (err) {
    console.log(err)

    const { message } = err
    retData = { message, ok: false }
    statusCode = 503

    failTask(message)
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
