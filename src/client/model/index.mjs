import { effect, batch } from '@preact/signals'
import fromNow from 'fromnow'
import { deserialize } from 'pixutil/json'
import Timer from 'timer'
import sortBy from 'sortby'
import addSignals from '@ludlovian/signal-extra/add-signals'

import Task from './task.mjs'
import { getQuery } from '../util.mjs'

const { fromEntries, entries, assign } = Object

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
      tasks: [],

      // local
      uptimeMs: 0,
      role: getQuery().role || 'watcher',

      // derived
      byID: () => fromEntries(this.tasks.map(t => [t.id, t])),
      task: () => this.byID[this.current],
      recent: () => this.tasks.filter(t => t.id !== this.current),
      uptime: () => fromNow(this.started, { suffix: true }, this.uptimeMs),
      isWorker: () => this.role === 'worker'
    })
  }

  _onData (data) {
    batch(() => {
      const { server = {}, tasks = {} } = data
      assign(this, server)
      for (const [id, value] of entries(tasks)) {
        if (this.byID[id]) {
          assign(this.byID[id], value)
        } else {
          const task = new Task(value)
          this.tasks = [...this.tasks, task]
            .filter(t => t.id >= this.oldest)
            .sort(sortBy(t => t.id, true))
        }
      }
    })
  }

  start () {
    this.source = new window.EventSource(
      `/api/status/updates?role=${this.role}`
    )
    this.source.onmessage = ({ data }) =>
      this._onData(deserialize(JSON.parse(data)))

    effect(this._tickUptime.bind(this))
    effect(this._monitor.bind(this))
  }

  stop () {
    this.source.close()
  }

  _tickUptime () {
    const tm = Timer.every(10e3)
      .call(() => (this.uptimeMs = Date.now() - this.started))
      .fire()
    return () => tm.cancel()
  }

  _monitor () {
    if (this.isWorker && this.task && this.task?.isDue) {
      this.stop()
      window.location.assign(`/api/task/${this.task.id}`)
    }
  }
}

const model = new Model()
window.model = model
export default model
