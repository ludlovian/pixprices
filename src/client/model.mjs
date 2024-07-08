import { effect, batch } from '@preact/signals'
import sortBy from '@ludlovian/sortby'
import signalbox from '@ludlovian/signalbox'

class Model {
  role = getRole()
  #dispose

  constructor () {
    signalbox(this, {
      // system details
      version: '',
      started: '',
      workers: 0,
      watchers: 0,
      isDev: undefined,

      // tasks
      tasks: [],

      // derived
      isReady: () => !!this.version,
      tasksById: () => Object.fromEntries(this.tasks.map(t => [t.id, t])),
      unfinished: () => this.tasks.filter(task => !task.isFinished),
      nextTask: () => this.unfinished.filter(t => t.status === 'due')[0],
      isWorker: () => this.role === 'worker',
      tasksByJob: () => Object.groupBy(this.unfinished, t => t.job),
      jobs: () =>
        Object.keys(this.tasksByJob).map(job => this.tasksByJob[job][0]),
      recent: () => this.tasks.filter(task => task.isFinished)
    })
  }

  #updateSystem (update) {
    for (const [k, v] of Object.entries(update)) {
      if (k in this) this[k] = v
    }
  }

  #addTask (data) {
    this.tasks = [...this.tasks, new Task(this, data)].sort(sortBy('due'))
  }

  #removeTask (id) {
    this.tasks = this.tasks.filter(t => t.id !== id)
  }

  onUpdate (data) {
    batch(() => {
      if ('system' in data) this.#updateSystem(data.system)

      if ('tasks' in data) {
        for (const [id, update] of Object.entries(data.tasks)) {
          if (this.tasksById[id]) {
            if (update) {
              this.tasksById[id].onUpdate(update)
            } else {
              this.#removeTask(id)
            }
          } else if (update) {
            this.#addTask(update)
          }
        }
      }
    })
  }

  start () {
    const source = new window.EventSource(
      `/api/status/updates?role=${this.role}`
    )
    source.onmessage = ({ data }) => this.onUpdate(JSON.parse(data))

    if (this.isWorker) {
      this.#dispose = effect(() => this.#monitorTasks())
    }
  }

  #monitorTasks () {
    const task = this.nextTask
    if (!task) return
    Promise.resolve().then(() => {
      this.#dispose()
      window.location.assign(`/api/task/${task.id}`)
    })
  }
}

class Task {
  #model
  id
  name
  due
  job

  constructor (model, data) {
    this.#model = model
    signalbox(this, {
      status: '',
      activity: [],

      isFinished: () => ['done', 'error'].includes(this.status)
    })

    this.onUpdate(data)
  }

  onUpdate (data) {
    for (const [k, v] of Object.entries(data)) {
      if (k in this) this[k] = v
    }
  }
}

function getRole () {
  const u = new URL(window.location.href)
  return u.searchParams.get('role') ?? 'watcher'
}

const model = new Model()
window.model = model
export default model
