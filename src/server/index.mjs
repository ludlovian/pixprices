import { createServer } from 'node:https'

import polka from 'polka'
import sirv from 'sirv'

import config from './config.mjs'
import { cors, log, parseBody } from './wares.mjs'
import * as handlers from './handlers.mjs'

class Server {
  static get instance () {
    if (this._instance) return this._instance
    this._instance = new Server()
    return this._instance
  }

  start () {
    const server = createServer(config.server.ssl)
    const app = (this.polka = polka({ server }))

    // middleware
    app
      .use(log)
      .use(cors) // handle CORS
      .use(sirv('src/client', { dev: config.isTest })) // static files
      .use(parseBody) // gather JSON bodies

      // routes
      .get('/status/inject', handlers.getInjectState)
      .get('/status/state', handlers.getState)
      .get('/status/updates', handlers.getStateStream)
      .get('/task/:id', handlers.requestTask)
      .post('/task/:id', handlers.postPrices)

    return new Promise((resolve, reject) => {
      app.server.on('error', reject)
      app.listen(config.server.port, '0.0.0.0', resolve)
    }).then(() => {
      console.log(`Listening on port ${config.server.port}`)
    })
  }
}

const server = Server.instance
export { server }
