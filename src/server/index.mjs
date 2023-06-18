import { createServer } from 'node:https'

import polka from 'polka'
import Debug from 'debug'

import { serverSSL, clientPath, serverPort } from './config.mjs'
import { staticFiles, cors, log, parseBody } from './wares.mjs'
import {
  getInjectState,
  getState,
  getStateStream,
  requestTask,
  postPrices
} from './handlers.mjs'

class Server {
  static get instance () {
    return (this._instance = this._instance || new Server())
  }

  debug = Debug('pixprices:server')

  start () {
    const server = createServer(serverSSL)
    const app = (this.polka = polka({ server }))

    // middleware
    app
      .use(cors)
      .use(staticFiles(clientPath))
      .use(log, parseBody({ json: true }))

      // routes
      .get('/api/status/inject', getInjectState)
      .get('/api/status/state', getState)
      .get('/api/status/updates', getStateStream)
      .get('/api/task/:id', requestTask)
      .post('/api/task/:id', postPrices)

    return new Promise((resolve, reject) => {
      server.on('error', reject)
      app.listen(serverPort, '0.0.0.0', () => {
        this.debug('Listening on port %d', serverPort)
        resolve()
      })
    })
  }
}

export const server = Server.instance
