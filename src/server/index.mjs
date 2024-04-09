import { createServer } from 'node:https'

import polka from 'polka'
import Debug from '@ludlovian/debug'

import { serverSSL, clientPath, serverPort } from './config.mjs'
import { staticFiles, cors, log, parseBody } from './wares.mjs'
import {
  getInjectState,
  getState,
  getStateStream,
  startNextTask,
  postData,
  addAdhocJob
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
      .get('/api/task/next', startNextTask)
      .post('/api/task/:id', postData)
      .post('/api/task/add/:name', addAdhocJob)

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
