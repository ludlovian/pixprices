import { effect } from '@preact/signals'
import addSignals from '@ludlovian/signal-extra/add-signals'
import Timer from 'timer'

import { fmtDuration } from '../util.mjs'

export default class Task {
  constructor (data) {
    addSignals(this, {
      // from server
      id: 0,
      job: '',
      name: '',
      due: undefined,
      status: '',
      activity: [],

      // local
      dueMs: 0,
      remaining: () => fmtDuration((this.dueMs / 1e3) | 0),
      isDue: () => this.status === 'due',
      isWaiting: () => this.status === 'wait'
    })

    Object.assign(this, data)

    effect(() => this._setupTicker())
  }

  _setupTicker () {
    if (!this.isWaiting) {
      this.dueMs = 0
      return
    }
    const tm = new Timer({ every: 1e3, fn: () => this._tick() }).fire()
    return () => tm.cancel()
  }

  _tick () {
    this.dueMs = Math.max(0, +this.due - Date.now())
  }
}
