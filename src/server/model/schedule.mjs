import { effect, batch } from '@preact/signals-core'
import Debug from '@ludlovian/debug'
import signalbox from '@ludlovian/signalbox'
import sortBy from '@ludlovian/sortby'
import config from '../config.mjs'
import { createJobs } from '../jobs/index.mjs'

export default class Schedule {
  #model
  #debug = Debug('pixprices:schedule')
  jobs

  constructor (model) {
    this.#model = model
    this.jobs = createJobs(this)

    signalbox(this, {
      // sorted list of tasks for each job
      queue: () =>
        this.jobs
          .map(j => j.tasks)
          .flat()
          .sort(sortBy('due')),

      // recent history of tompleted tasks
      taskHistory: [],

      //
      // derived data
      //

      allTasks: () => [...this.queue, ...this.taskHistory],

      jobByName: () =>
        Object.fromEntries(this.jobs.map(job => [job.name, job])),

      taskById: () => Object.fromEntries(this.allTasks.map(t => [t.id, t]))
    })

    effect(() => this.#monitorSchedule())
  }

  #monitorSchedule () {
    batch(() => {
      // First we check for any finished task and archive them
      this.jobs.forEach(job => {
        const finished = job.tasks.filter(task => task.isFinished)
        if (finished.count) {
          this.#archiveTasks(finished)
          job.tasks = job.tasks.filter(task => !task.isFinished)
        }
      })

      // Now we check every known future task has been created
      const nextDues = this.jobs
        .map(job => job.getNextTimes().map(due => ({ job, due })))
        .flat()
        .sort(sortBy('due'))

      nextDues.forEach(({ job, due }) => {
        // check if in history or the queue
        if (
          !this.taskHistory.find(task => task.matches(job, due)) &&
          !job.tasks.find(task => task.matches(job, due))
        ) {
          job.addTask(due)
        }
      })
    })
  }

  toJSON () {
    // we simply list all tasks we know about - past and future
    const tasks = Object.fromEntries(
      [...this.queue, ...this.taskHistory].map(t => [t.id, t.toJSON()])
    )
    return { tasks }
  }

  #archiveTasks (tasks) {
    this.taskHistory = [...this.taskHistory, ...tasks].slice(
      -config.taskHistoryLength
    )
  }
}
