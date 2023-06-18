import { effect, batch } from '@preact/signals-core'

import Debug from 'debug'
import sortBy from 'sortby'
import Timer from 'timer'

import { dateFormatter, dateFromDayAndTime, advanceOneDay } from './util.mjs'
import { addSignals, until } from './signal-extra.mjs'
import {
  jobs,
  taskHistoryLength,
  taskTimeout,
  taskLookback,
  isDev
} from '../config.mjs'

class Tasks {
  static get instance () {
    return (this._instance = this._instance || new Tasks())
  }

  debug = Debug('pixprices:task')

  constructor () {
    addSignals(this, {
      current: undefined,
      recent: [],
      state: () => ({
        current: this.current.state,
        recent: this.recent.map(t => t.state)
      })
    })

    this._lastID = 0
    this.jobs = jobs.map(spec => new Job(spec))

    effect(() => {
      if (!this.current || this.current.isFinished) this.next()
    })
  }

  next () {
    batch(() => {
      this.recent = [this.current, ...this.recent]
        .filter(Boolean)
        .slice(0, taskHistoryLength)
      const job = this.jobs.sort(sortBy(j => j.current.due))[0]
      const task = job.current
      job.next()
      task.id = ++this._lastID
      task.lifecycle()
      this.current = task
      this.debug('Task #%d added - %s', task.id, task.name)
    })
  }
}

class Job {
  constructor (spec) {
    this.spec = spec
    this.next()
  }

  * _stream () {
    const now = new Date()
    const { times } = this.spec
    const dates = times.sort().map(tm => dateFromDayAndTime(now, tm))
    while (true) {
      for (const [ix, date] of dates.entries()) {
        if (date > now) yield date
        dates[ix] = advanceOneDay(date)
      }
    }
  }

  next () {
    if (!this._iter) this._iter = this._stream()
    const now = Date.now()
    let due
    while (true) {
      due = this._iter.next().value
      if (+due >= now - taskLookback) break
    }
    this.current = new Task({ ...this.spec, due })
  }
}

class Task {
  static fmtTime = dateFormatter('{HH}:{mm} on {DDD} {D} {MMM}')
  static STAGES = ['', 'wait', 'due', 'start', 'done', 'error']
  static WAIT = 1
  static DUE = 2
  static START = 3
  static DONE = 4
  static ERROR = 5

  debug = Debug('pixprices:task')

  constructor (data) {
    addSignals(this, {
      // core
      id: 0,
      job: '',
      due: undefined,
      stage: 0,
      url: '',
      activity: [],

      // derived
      status: () => Task.STAGES[this.stage],
      name: () => this._name(),
      isDue: () => this.stage >= Task.DUE,
      isStarted: () => this.stage >= Task.START,
      isFinished: () => this.stage >= Task.DONE,
      state: () => ({
        id: this.id,
        job: this.job,
        name: this.name,
        due: this.due,
        status: this.status,
        activity: this.activity
      })
    })

    Object.assign(this, data)
  }

  _name () {
    return this.due ? `${this.job} @ ${Task.fmtTime(this.due)}` : ''
  }

  async lifecycle () {
    const tm = new Timer()
    this.stage = Task.WAIT
    tm.set({ at: this.due, fn: () => (this.stage = Task.DUE) })

    await until(() => this.isDue)
    tm.cancel()

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

if (isDev) global.tasks = Tasks.instance
export default Tasks.instance
