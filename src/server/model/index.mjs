import Debug from '@ludlovian/debug'
import addSignals from '@ludlovian/signal-extra/add-signals'
import subscribe from '@ludlovian/signal-extra/subscribe'

import jobs from './jobs.mjs'
import { isDev } from '../config.mjs'

class Model {
  started = new Date()
  debug = Debug('pixprices:model')

  constructor () {
    this.version = process.env.npm_package_version || 'dev'
    this.jobs = jobs

    addSignals(this, {
      // core data
      watcherCount: 0,
      workerCount: 0,

      // derived data
      task: () => this.jobs.current,

      // state for the client
      state: () => ({
        server: {
          version: this.version,
          started: this.started,
          watchers: this.watcherCount,
          workers: this.workerCount,
          isDev
        },
        ...this.jobs.state
      })
    })
  }

  isCurrent (id) {
    return this.jobs.hasCurrent && this.jobs.taskId.toString() === id
  }

  listen (role, callback) {
    if (role !== 'worker') role = 'watcher'
    this.debug('New %s listening', role)
    this[role + 'Count']++

    const unsub = subscribe(() => this.state, callback, { depth: 1 })

    return () => {
      this.debug('%s stopped listening', role)
      unsub()
      this[role + 'Count']--
    }
  }
}

const model = new Model()
if (isDev) global.model = model
export default model
