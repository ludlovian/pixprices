import { batch } from '@preact/signals-core'
import addSignals from '@ludlovian/signal-extra/add-signals'
import until from '@ludlovian/signal-extra/until'
import Debug from '@ludlovian/debug'
import Timer from 'timer'

import { dateFormatter } from './util.mjs'
import { taskTimeout } from '../config.mjs'

export default class Task {
  static fmtTime = dateFormatter('{HH}:{mm} on {DDD} {D} {MMM}')
  static STAGES = ['', 'wait', 'due', 'start', 'done', 'error']
  static WAIT = 1
  static DUE = 2
  static START = 3
  static DONE = 4
  static ERROR = 5

  debug = Debug('pixprices:task')

  constructor (job, due) {
    this.job = job
    this.due = due
    Object.assign(this, job.spec)

    addSignals(this, {
      // core
      // id is only assigned when we actually commission this job
      id: undefined,
      stage: 0,
      activity: [],

      // derived
      status: () => Task.STAGES[this.stage],
      name: () => this._name(),
      isDue: () => this.stage >= Task.DUE,
      isStarted: () => this.stage >= Task.START,
      isFinished: () => this.stage >= Task.DONE,

      // state sent to client
      state: () => ({
        id: this.id,
        job: this.job.name,
        name: this.name,
        due: this.due,
        status: this.status,
        activity: this.activity
      })
    })

    this._lifecycle()
  }

  _name () {
    return this.due ? `${this.job.name} @ ${Task.fmtTime(this.due)}` : ''
  }

  async _lifecycle () {
    const tm = new Timer()
    const now = new Date()

    if (this.due > now) {
      this.stage = Task.WAIT
      tm.set({ at: this.due, fn: () => (this.stage = Task.DUE) })

      await until(() => this.isDue)
      tm.cancel()
    } else {
      this.stage = Task.DUE
    }

    await until(() => this.isStarted)
    tm.set({ after: taskTimeout, fn: () => this.fail('Timed out') })

    await until(() => this.isFinished)
    tm.cancel()
  }

  start () {
    this.debug('Task #%d started', this.id)
    this._update(Task.START, 'Started')
  }

  complete (msg) {
    this.debug('Task #%d completed: %s', this.id, msg)
    this._update(Task.DONE, msg)
  }

  fail (msg) {
    this.debug('Task #%d failed: %s', this.id, msg)
    this._update(Task.ERROR, msg)
  }

  _update (stage, message) {
    batch(() => {
      this.stage = stage
      this.activity = [...this.activity, { when: new Date(), message }]
    })
  }
}
