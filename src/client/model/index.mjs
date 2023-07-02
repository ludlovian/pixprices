import { effect, batch } from '@preact/signals'
import { deserialize } from 'pixutil/json'
import sortBy from 'sortby'
import addSignals from '@ludlovian/signal-extra/add-signals'

import Task from './task.mjs'
import { getQuery } from '../util.mjs'

const { fromEntries, entries } = Object

class Model {
  constructor () {
    addSignals(this, {
      // from server
      version: '',
      started: '',
      watchers: 0,
      workers: 0,
      oldest: 0,
      current: 0,
      isDev: false,
      tasks: [],

      // local
      role: getQuery().role || 'watcher',

      // derived
      byID: () => fromEntries(this.tasks.map(t => [t.id, t])),
      task: () => this.byID[this.current],
      recent: () => this.tasks.filter(t => t.id !== this.current),
      isWorker: () => this.role === 'worker'
    })
  }

  _onData (data) {
    batch(() => {
      if ('server' in data) {
        for (const [key, value] of entries(data.server)) {
          if (key in this) this[key] = value
        }
      }

      if ('tasks' in data) {
        for (const [id, update] of entries(data.tasks)) {
          const task = this.byID[id]
          if (task) {
            task._onData(update)
          } else {
            const task = new Task(this, update)
            this.tasks = [...this.tasks, task]
              .filter(t => t.id >= this.oldest)
              .sort(sortBy(t => t.id, true))
          }
        }
      }
    })
  }

  start () {
    const source = new window.EventSource(
      `/api/status/updates?role=${this.role}`
    )
    source.onmessage = ({ data }) => this._onData(deserialize(JSON.parse(data)))

    const dispose = effect(() => {
      if (this.isWorker && this.task?.isDue) {
        Promise.resolve().then(() => {
          source.close()
          dispose()
          window.location.assign(`/api/task/${this.task.id}`)
        })
      }
    })
  }
}

const model = new Model()
window.model = model
export default model
