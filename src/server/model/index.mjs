import { effect, batch } from '@preact/signals-core'
import Debug from '@ludlovian/debug'
import sortBy from 'sortby'
import addSignals from '@ludlovian/signal-extra/add-signals'
import subscribe from '@ludlovian/signal-extra/subscribe'

import jobs from './jobs.mjs'
import { isDev, taskHistoryLength } from '../config.mjs'

const { fromEntries } = Object

class Model {
  started = new Date()
  debug = Debug('pixprices:model')

  constructor () {
    addSignals(this, {
      // core data
      version: process.env.npm_package_version || 'dev',
      watcherCount: 0,
      workerCount: 0,
      tasks: [],

      // derived
      currentID: () => Math.max(...this.tasks.map(t => t.id)),
      oldestID: () => Math.min(...this.tasks.map(t => t.id)),
      byID: () => fromEntries(this.tasks.map(t => [t.id, t])),
      task: () => this.byID[this.currentID],
      state: () => ({
        server: {
          version: this.version,
          started: this.started,
          watchers: this.watcherCount,
          workers: this.workerCount,
          oldest: this.oldestID,
          current: this.currentID,
          isDev
        },
        tasks: fromEntries(this.tasks.map(t => [t.id, t.state]))
      })
    })

    effect(() => {
      if (!this.task || this.task.isFinished) this.addTask()
    })
  }

  addTask () {
    batch(() => {
      const task = jobs.nextTask()
      this.tasks = [...this.tasks, task]
        .sort(sortBy('id'))
        .slice(-taskHistoryLength)
    })
  }

  listen (role, callback) {
    if (role !== 'worker') role = 'watcher'
    this.debug('New %s listening', role)
    this[role + 'Count']++

    const unsub = subscribe(() => this.state, callback)

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
