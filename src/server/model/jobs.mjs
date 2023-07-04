import { effect, batch } from '@preact/signals-core'
import Debug from '@ludlovian/debug'
import sortBy from 'sortby'
import addSignals from '@ludlovian/signal-extra/add-signals'

import { jobs as configJobs, taskHistoryLength, isDev } from '../config.mjs'
import Task from './task.mjs'
import { dateFromDayAndTime, advanceOneDay } from './util.mjs'

const { fromEntries } = Object

class Jobs {
  debug = Debug('pixprices:jobs')

  constructor (parent) {
    this._parent = parent

    addSignals(this, {
      // core data
      jobs: configJobs.map(spec => new Job(this, spec)),
      queue: [],
      current: null,
      taskId: 1,
      history: [],

      // derived
      byName: () => fromEntries(this.jobs.map(job => [job.name, job])),
      hasCurrent: () => this.current != null,
      oldestId: () =>
        this.history.length
          ? Math.min(...this.history.map(task => task.id))
          : 0,
      nextTasks: () =>
        this.jobs.map(job => this.queue.find(task => task.job === job)),

      // state for the client
      state: () => ({
        task: this.current?.state ?? null,
        history: this.history.map(task => task.state),
        jobs: this.nextTasks
          .map(task => ({
            job: task.job.name,
            due: task.due,
            name: task.name
          }))
          .sort(sortBy('due'))
      }),
      injectState: () => ({
        id: this.current?.id ?? null,
        url: this.current?.url ?? null,
        status: this.current?.status ?? null,
        isDev
      })
    })

    this.buildQueue()
    effect(() => this._monitor())
  }

  _monitor () {
    batch(() => {
      if (this.hasCurrent && this.current.isFinished) {
        this.debug('Archiving "%s"', this.current.name)
        this.history = [...this.history, this.current].slice(-taskHistoryLength)
        this.current = null
        this.taskId++
      }

      if (!this.hasCurrent && this.queue[0]?.isDue) {
        const [task, ...rest] = this.queue
        task.id = this.taskId
        this.current = task
        this.queue = rest
        this.buildQueue()
        this.debug('Task "%s" made current', task.name)
      }
    })
  }

  buildQueue () {
    batch(() => {
      for (const job of this.jobs) {
        for (const due of job.getNextDues()) {
          if (!this._isInQueue(job, due)) {
            const task = new Task(job, due)
            this.debug('"%s" added to queue', task.name)
            this.queue = [...this.queue, task].sort(sortBy('due'))
          }
        }
      }
    })
  }

  _isInQueue (job, due) {
    const matches = task => task.job === job && +task.due === +due
    return this.queue.findIndex(matches) !== -1
  }

  addAdhoc (name) {
    const now = new Date()
    const job = this.byName[name]
    if (!job) return false

    batch(() => {
      const task = new Task(job, now)
      this.queue = [task, ...this.queue]
      this.debug('Added adhoc job "%s"', task.name)
    })
    return true
  }
}

class Job {
  constructor (parent, { times, name, ...spec }) {
    this._parent = parent
    this.times = times
    this.name = name
    this.spec = spec
  }

  getNextDues () {
    return this.times.map(nextTime)
  }
}

function nextTime (tm) {
  const now = new Date()
  const dt = dateFromDayAndTime(now, tm)
  return dt > now ? dt : advanceOneDay(dt)
}

const jobs = new Jobs()
export default jobs
