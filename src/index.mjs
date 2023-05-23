import { createServer } from 'node:https'
import { readFileSync, writeFileSync } from 'node:fs'

import polka from 'polka'
import sirv from 'sirv'

import config from './config.mjs'
import { cors, log, parseBody } from './wares.mjs'
import {
  getInjectState,
  getState,
  getStateStream,
  requestTask,
  postPrices
} from './handlers.mjs'

function main () {
  makeInjectFile()

  const server = createServer(config.server.ssl)
  polka({ server })
    // middleware
    .use(log) // log to screen
    .use(cors) // handle CORS
    .use(sirv('src/client', { dev: config.isTest })) // static files
    .use(parseBody) // gather JSON bodies

    // routes
    .get('/status/inject', getInjectState)
    .get('/status/state', getState)
    .get('/status/updates', getStateStream)
    .get('/task/:id', requestTask)
    .post('/task/:id', postPrices)

    // start
    .listen(config.server.port, '0.0.0.0', () => {
      console.log(`Listening on port ${config.server.port}`)
    })
}

function makeInjectFile () {
  const src = 'src/client/inject.template.js'
  const tgt = 'src/client/inject.js'
  const ph = '{{SERVER_ORIGIN}}'
  const val = config.server.origin

  writeFileSync(tgt, readFileSync(src, 'utf-8').replace(ph, val))
}

main()
