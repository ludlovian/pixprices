import Debug from 'debug'

import { subscribe } from './subscribe.mjs'
import tasks from './task.mjs'
import { addSignals } from './signal-extra.mjs'
import { isDev } from '../config.mjs'

class Model {
  started = new Date()
  debug = Debug('pixprices:model')

  constructor () {
    addSignals(this, {
      watchers: 0,
      workers: 0,
      task: () => tasks.current,
      state: () => ({
        server: {
          started: this.started,
          watchers: this.watchers,
          workers: this.workers
        },
        ...tasks.state
      })
    })
    this.tasks = tasks
  }

  listen (role, callback) {
    this.debug('New %s listening', role)
    if (role === 'worker') this.workers++
    else this.watchers++

    const unsub = subscribe(() => this.state, callback)

    return () => {
      this.debug('%s stopped listening', role)
      unsub()
      if (role === 'worker') this.workers--
      else this.watchers--
    }
  }
}

const model = new Model()
if (isDev) global.model = model
export default model
