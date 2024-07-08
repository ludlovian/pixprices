import { batch, effect } from '@preact/signals-core'
import Debug from '@ludlovian/debug'
import Timer from '@ludlovian/timer'
import signalbox from '@ludlovian/signalbox'
import config from '../config.mjs'
import { dateFormatter } from './util.mjs'

const fmtTime = dateFormatter('{HH}:{mm} on {DDD} {D} {MMM}')

// A task is a piece of work to be executed
//
// It is a job with a due datetime
//
// It goes through a number of stages

const STAGES = ['', 'wait', 'due', 'start', 'done', 'error']
const WAIT = 1
const DUE = 2
const START = 3
const DONE = 4
const ERROR = 5

const lastIds = { task: 0, adhoc: 0 }

export default class Task {
  #job
  #due
  #debug = Debug('pixprices:task')
  #tm

  constructor (job, due, isAdhoc) {
    this.#job = job
    this.#due = due
    this.id = isAdhoc ? `x${++lastIds.adhoc}` : `t${++lastIds.task}`

    signalbox(this, {
      // core
      //
      stage: WAIT,
      activity: [],

      // derived
      //
      status: () => STAGES[this.stage],
      name: () => this.#getName(),
      isDue: () => this.stage === DUE,
      isStarted: () => this.stage >= START,
      isFinished: () => this.stage >= DONE
    })

    this.#debug('Created %s - %s', this.id, this.name)

    effect(() => this.#monitorLifecycle())
  }

  // --------------------------------------------------------
  //
  // Getters
  //
  get job () {
    return this.#job
  }

  get due () {
    return this.#due
  }

  get schedule () {
    return this.job.schedule
  }

  matches (job, due) {
    return this.#job === job && +due === +this.#due
  }

  // --------------------------------------------------------
  //
  // Derived data
  //

  #getName () {
    return this.#due ? `${this.#job.name} @ ${fmtTime(this.#due)}` : ''
  }

  toJSON () {
    return {
      id: this.id,
      name: this.name,
      due: this.due,
      job: this.job.name,
      status: this.status,
      activity: this.activity
    }
  }

  // --------------------------------------------------------
  //
  // Reactions
  //

  async #monitorLifecycle () {
    // Automatically set WAIT->DUE based on time
    // and also setup timeout from START->ERROR
    batch(() => {
      if (this.#tm) this.#tm.cancel()
      this.#tm = undefined

      if (this.stage === WAIT) {
        const now = new Date()
        if (this.#due > now) {
          this.#tm = new Timer({
            ms: +this.#due - +now,
            fn: () => this.#markDue()
          })
        } else {
          this.#markDue()
        }
      } else if (this.stage === START) {
        this.#tm = new Timer({
          ms: config.taskTimeout,
          fn: () => this.failTask('Timed out')
        })
      }
    })
  }

  // --------------------------------------------------------
  //
  // Task management
  //

  #markDue () {
    if (this.stage !== DUE) {
      this.stage = DUE
      this.#debug('Task %s now due', this.id)
    }
  }

  startTask () {
    this.#debug('Task %s started', this.id)
    this.#updateStatus(START, 'Started')
    return this.job.start(this)
  }

  completeTask (msg) {
    this.#debug('Task %s completed: %s', this.id, msg)
    this.#updateStatus(DONE, msg)
  }

  failTask (msg) {
    this.#debug('Task %s failed: %s', this.id, msg)
    this.#updateStatus(ERROR, msg)
  }

  #updateStatus (stage, message) {
    batch(() => {
      this.stage = stage
      this.activity = [...this.activity, { when: new Date(), message }]
    })
  }
}
