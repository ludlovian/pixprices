import Debug from 'debug'
import sortBy from 'sortby'

import { jobs as configJobs, taskLookback } from '../config.mjs'
import Task from './task.mjs'
import { dateFromDayAndTime, advanceOneDay } from './util.mjs'

class Jobs {
  debug = Debug('pixprices:jobs')

  constructor () {
    this.jobs = configJobs.map(spec => new Job(spec))
    this.lastID = 0
  }

  nextTask () {
    const job = this.jobs.sort(sortBy(j => j.current.due))[0]
    const task = job.current
    job.next()
    task.id = ++this.lastID
    task.lifecycle()
    this.debug('Task #%d created - %s', task.id, task.name)
    return task
  }
}

class Job {
  constructor (spec) {
    const { times, ...rest } = spec
    this.spec = rest
    this.times = times
    this.next()
  }

  * _stream () {
    const now = new Date()
    const dates = this.times.sort().map(tm => dateFromDayAndTime(now, tm))
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

const jobs = new Jobs()
export default jobs
