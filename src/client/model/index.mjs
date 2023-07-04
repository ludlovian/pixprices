import { effect, batch } from '@preact/signals'
import sortBy from 'sortby'
import addSignals from '@ludlovian/signal-extra/add-signals'

import { getQuery } from '../util.mjs'
import Task from './task.mjs'

const { assign, entries } = Object
const defer = Promise.prototype.then.bind(Promise.resolve())

class Model {
  constructor () {
    addSignals(this, {
      // from server
      version: '',
      started: '',
      workers: 0,
      watchers: 0,
      task: new Task(),
      history: [],
      jobs: [],

      // local
      role: getQuery().role || 'watcher',

      // derived
      recent: () => this.history.sort(sortBy('id', true)),
      isWorker: () => this.role === 'worker'
    })
  }

  _onData (data) {
    batch(() => {
      for (const [key, value] of entries(data)) {
        if (key === 'server') {
          assign(this, value)
        } else if (key === 'task') {
          if (value === null) {
            this.task = null
          } else {
            if (!this.task) this.task = new Task()
            this.task._onData(value)
          }
        } else {
          if (key in this) this[key] = value
        }
      }
    })
  }

  start () {
    const source = new window.EventSource(
      `/api/status/updates?role=${this.role}`
    )
    source.onmessage = ({ data }) => this._onData(JSON.parse(data))

    const dispose = effect(() => {
      if (this.isWorker && this.task?.isDue) {
        defer(() => {
          source.close()
          dispose()
          window.location.assign('/api/task/next')
        })
      }
    })
  }
}

const model = new Model()
window.model = model
export default model
