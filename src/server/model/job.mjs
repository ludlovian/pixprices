import signalbox from '@ludlovian/signalbox'
import sortBy from '@ludlovian/sortby'
import Task from './task.mjs'

// Job
//
// A job represents a repeatable thing to be done
//
// A task is created for each due time
//
// Subclasses of this have the actual job logic
//

export default class Job {
  #schedule
  name
  #times
  constructor (schedule, { name, times }) {
    this.#schedule = schedule
    this.name = name
    this.#times = times

    signalbox(this, {
      tasks: []
    })
  }

  // --------------------------------------------------------
  //
  // Getters / setters
  //

  get schedule () {
    return this.#schedule
  }

  // --------------------------------------------------------
  //
  // Derived data
  //

  getNextTimes () {
    return this.#times.map(nextTime)
  }

  // --------------------------------------------------------
  //
  // Add tasks
  //

  #addTask (t) {
    this.tasks = [...this.tasks, t].sort(sortBy('due'))
  }

  addTask (due) {
    this.#addTask(new Task(this, due))
  }

  addAdhocTask () {
    this.#addTask(new Task(this, new Date(), true))
  }

  // ---------------------------------------------
  //
  // Job executions
  //
  // Jobs are started by their tasks when one becomes due
  // The task will call 'start' which should start the work
  // but can also return { redirect }
  //
  // If data is received for a task, it will be send to
  // 'receiveData'
  //
  // Once the work is complete, the job should inform the
  // task by completeTask / failTask

  start (task) {}

  async receiveData (task, data) {}
}

function nextTime (tm) {
  const now = new Date()
  const dt = dateFromDayAndTime(now, tm)
  return dt > now ? dt : advanceOneDay(dt)
}

function dateFromDayAndTime (day, tm) {
  const [hh, mm] = tm.split(':').map(s => parseInt(s))
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm)
}

function advanceOneDay (date) {
  const tomorrow = new Date(date.getTime() + 24 * 60 * 60 * 1000)
  const hhmm = date.toTimeString().slice(0, 5)
  return dateFromDayAndTime(tomorrow, hhmm)
}
