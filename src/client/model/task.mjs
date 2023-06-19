import { effect } from '@preact/signals'

import Timer from 'timer'

import { addSignals } from './signal-extra.mjs'
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

    effect(this._setupTicker.bind(this))
  }

  _setupTicker () {
    if (!this.isWaiting) {
      this.dueMs = 0
      return
    }
    const tm = Timer.every(1e3).call(this._tick.bind(this))
    tm.fire()
    return tm.cancel.bind(tm)
  }

  _tick () {
    this.dueMs = Math.max(0, +this.due - Date.now())
  }
}
