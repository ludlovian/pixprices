import { createServer } from 'node:https'

import polka from 'polka'

import config from './config.mjs'
import { cors, log, serveStatic, parseBody } from './wares.mjs'
import { getStateStream, requestTask, postPrices } from './handlers.mjs'
import { $injectState } from './model.mjs'

const staticOpts = {
  rename (path) {
    if (path === '/') return '/index.html'
    if (path.startsWith('/js')) return path.slice(3)
    return undefined
  },

  modify ({ res, path, body }) {
    if (path === '/inject.js') {
      res.setHeader('cache-control', 'no-store, no-cache')
      return body.replaceAll('{{INJECT_STATE}}', $injectState.value)
    } else {
      return body
    }
  }
}

function main () {
  const server = createServer(config.server.ssl)
  polka({ server })
    // middleware
    .use(log, cors, serveStatic('src/client', staticOpts), parseBody)

    // routes
    .get('/status', getStateStream)
    .get('/task/:id', requestTask)
    .post('/task/:id', postPrices)
    // start
    .listen(config.server.port, '0.0.0.0', () => {
      console.log(`Listening on port ${config.server.port}`)
    })
}

main()
