import { effect } from '@preact/signals'
import fromNow from 'fromnow'
import { deserialize } from 'pixutil/json'
import Timer from 'timer'

import { addSignals } from './signal-extra.mjs'
import { getQuery, fmtDuration } from '../util.mjs'

class Model {
  constructor () {
    addSignals(this, {
      server: {},
      current: {},
      recent: [],
      dueMs: 0,
      serverUptimeMs: 0,
      role: getQuery().role || 'watcher',
      isWorker: () => this.role === 'worker',
      remaining: () => fmtDuration((this.dueMs / 1000) | 0),
      isDue: () => this.current.status === 'due',
      uptime: () =>
        fromNow(this.server.started, { suffix: true }, this.serverUptimeMs)
    })

    this.start()
  }

  start () {
    const es = new window.EventSource(`/api/status/updates?role=${this.role}`)
    es.onmessage = ({ data }) => {
      data = deserialize(JSON.parse(data))
      Object.assign(this, data)
    }

    effect(this._tickDue.bind(this))
    effect(this._tickUptime.bind(this))
    effect(this._monitor.bind(this))
  }

  _tickDue () {
    const task = this.current
    if (task.status !== 'wait') {
      this.dueMs = 0
      return
    }
    const tm = new Timer({
      every: 1000,
      fn: () => {
        const ms = Math.max(+task.due - Date.now(), 0)
        if (ms === 0) tm.cancel()
        this.dueMs = ms
      }
    })
    return () => tm.cancel()
  }

  _tickUptime () {
    const tm = new Timer({
      every: 10 * 1000,
      fn: () => (this.serverUptimeMs = Date.now() - this.server.started)
    })
    return () => tm.cancel()
  }

  _monitor () {
    const task = this.current
    if (task.status === 'due' && this.isWorker) {
      const { id } = task
      window.location.assign(`/api/task/${id}`)
    }
  }
}

const model = new Model()
window.model = model
export default model
