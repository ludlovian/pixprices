import { createServer } from 'node:https'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import polka from 'polka'
import Debug from '@ludlovian/debug'

import config from './config.mjs'
import { staticFiles, cors, log, parseBody } from './wares.mjs'
import { getStateStream, startTask, postData, addAddHoc } from './handlers.mjs'

class Server {
  static #instance
  static get instance () {
    return (this.#instance = this.#instance || new Server())
  }

  debug = Debug('pixprices:server')

  start () {
    staticFiles.reset()

    const server = createServer(getSSLCreds())
    const app = (this.polka = polka({ server }))

    // middleware
    app
      .use(cors)
      .use(staticFiles(config.clientPath, ['/api']))
      .use(log)
      .use('/api', parseBody({ json: true }))

      // routes
      .get('/api/status/updates', getStateStream)
      .get('/api/task/:id', startTask)
      .post('/api/task/:id', postData)
      .post('/api/job/:name', addAddHoc)

    return new Promise((resolve, reject) => {
      server.on('error', reject)
      app.listen(config.serverPort, '0.0.0.0', () => {
        this.debug('Listening on port %d', config.serverPort)
        resolve()
      })
    })
  }
}

function getSSLCreds () {
  const { sslCredsDir, fullHostname } = config
  const keyFile = join(sslCredsDir, `${fullHostname}.key`)
  const crtFile = join(sslCredsDir, `${fullHostname}.crt`)
  return {
    key: readFileSync(keyFile),
    cert: readFileSync(crtFile)
  }
}

export const server = Server.instance
