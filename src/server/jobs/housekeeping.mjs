import { promisify } from 'node:util'
import { exec as exec_ } from 'node:child_process'
import Debug from '@ludlovian/debug'
import Job from '../model/job.mjs'

const exec = promisify(exec_)
const debug = Debug('pixprices:housekeeping')

export default class Housekeeping extends Job {
  command

  constructor (schedule, data) {
    super(schedule, data)
    this.command = data.command
  }

  start (task) {
    Promise.resolve()
      .then(() => this.run(task))
      .catch(err => {
        console.error(err)
        task.failTask(err.message)
      })

    return {}
  }

  async run (task) {
    debug('Running %s', this.command)
    await exec(this.command)
    task.completeTask('Completed')
  }
}
