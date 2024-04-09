import { parse as parseQS } from 'node:querystring'

import Debug from '@ludlovian/debug'

import model from './model/index.mjs'
import { startTask, completeTask } from './jobs/index.mjs'

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
  const state = model.jobs.injectState
  const s = JSON.stringify(state)
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

export async function startNextTask (req, res) {
  debug('requestNextTask')
  if (!model.task) return res.writeHead(404).end()

  model.task.start()
  const url = await startTask(model.task)

  res
    .writeHead(302, {
      Location: url,
      'Content-Length': 0
    })
    .end()
}

export async function postData (req, res) {
  debug('postData %o', req.params)
  if (!model.isCurrent(req.params.id)) return res.writeHead(404).end()

  let statusCode = 200
  let retData

  try {
    const message = await completeTask(model.task, req.json)
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

export function addAdhocJob (req, res) {
  debug('addAdhocJob %o', req.params)
  if (model.jobs.addAdhoc(req.params.name)) {
    res.writeHead(200).end()
  } else {
    res.writeHead(404).end()
  }
}
