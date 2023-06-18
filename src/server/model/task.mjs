import { effect, batch } from '@preact/signals-core'

import Debug from 'debug'
import sortBy from 'sortby'
import Timer from 'timer'

import { dateFormatter, dateFromDayAndTime, advanceOneDay } from './util.mjs'
import { addSignals } from './signal-extra.mjs'
import {
  jobs,
  taskHistoryLength,
  taskTimeout,
  taskLookback,
  isDev
} from '../config.mjs'

const fmtTime = dateFormatter('{HH}:{mm} on {DDD} {D} {MMM}')

const WAIT = 'wait'
const DUE = 'due'
const START = 'start'
const DONE = 'done'
const ERROR = 'error'

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
    this.next()

    effect(() => this._monitor())
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
      task.status = WAIT
      this.current = task
      this.debug('Task #%d added - %s', task.id, task.name)
    })
  }

  _monitor () {
    if (!this.current) return
    const task = this.current
    if (task.status === WAIT) {
      const tm = new Timer({
        at: task.due,
        fn: () => (task.status = DUE)
      })
      return () => tm.cancel()
    } else if (task.status === START) {
      const tm = new Timer({
        after: taskTimeout,
        fn: () => task.fail('Timed out')
      })
      return () => tm.cancel()
    } else if (task.status === DONE || task.status === ERROR) {
      this.next()
    }
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
  debug = Debug('pixprices:task')

  constructor (data) {
    addSignals(this, {
      id: 0,
      job: '',
      due: undefined,
      name: () => this._name(),
      status: '',
      activity: [],
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
    return this.due ? `${this.job} @ ${fmtTime(this.due)}` : ''
  }

  start () {
    this.debug('Task #%d started', this.id)
    this._update(START, 'Started')
  }

  complete (msg) {
    this.debug('Task #%d completed: %s', this.id, msg)
    this._update(DONE, msg)
  }

  fail (msg) {
    this.debug('Task #%d failed: %s', this.id, msg)
    this._update(ERROR, msg)
  }

  _update (status, message) {
    batch(() => {
      this.status = status
      this.activity = [...this.activity, { when: new Date(), message }]
    })
  }
}

if (isDev) global.tasks = Tasks.instance
export default Tasks.instance
