import config from './config.mjs'
import { signal, computed, effect, batch } from '@preact/signals-core'

import Timer from 'timer'

import { getAllTasks } from './task.mjs'

const WAIT = 'wait'
const DUE = 'due'
const START = 'start'
const DONE = 'done'
const ERROR = 'error'

const iterTask = getAllTasks(config.jobs)

//
// Core data
//

const $taskSpec = signal({})
const $taskStatus = signal(undefined)
const $taskActivity = signal([])
const $recent = signal([])
const $watcherCount = signal(0)
const $workerCount = signal(0)
const serverStarted = new Date()

//
// Derived data
//

const $server = computed(() => ({
  started: serverStarted,
  workers: $workerCount.value,
  watchers: $watcherCount.value,
  isTest: config.isTest
}))

const $task = computed(() => ({
  ...$taskSpec.value,
  status: $taskStatus.value,
  activity: $taskActivity.value
}))

const $state = computed(() => ({
  server: $server.value,
  task: $task.value,
  history: $recent.value
}))

const $taskMissing = computed(() => $taskSpec.value.id == null)
const $taskFinished = computed(() => [DONE, ERROR].includes($taskStatus.value))

//
// Automatic reactions
//

effect(() => {
  if ($taskMissing.value || $taskFinished.value) addNewTask()
})

effect(() => {
  if ($taskStatus.value === WAIT) {
    const tm = new Timer({
      at: $taskSpec.value.due,
      fn: () => {
        $taskStatus.value = DUE
      }
    })
    return () => tm.cancel()
  }
})

effect(() => {
  if ($taskStatus.value === START) {
    const tm = new Timer({
      after: config.task.timeout,
      fn: () => {
        failTask('Timed out')
      }
    })
    return () => tm.cancel()
  }
})

//
// Action functions
//

function addClient (role) {
  const $sig = role === 'worker' ? $workerCount : $watcherCount
  $sig.value += 1
  return () => {
    $sig.value = Math.max(0, $sig.value - 1)
    return true
  }
}

function addNewTask () {
  batch(() => {
    $recent.value = [$task.value, ...$recent.value]
      .filter(t => t.activity.length)
      .slice(0, config.task.historyLength)

    // load in new task and set to waiting
    $taskSpec.value = iterTask.next().value
    $taskStatus.value = WAIT
    $taskActivity.value = []
  })
}

function startTask (req, res) {
  batch(() => {
    // called to start a task
    $taskStatus.value = START
    record($taskActivity, 'Started')

    res
      .writeHead(302, {
        Location: $taskSpec.value.url,
        'Content-Length': 0
      })
      .end()
  })
}

function completeTask (message) {
  batch(() => {
    $taskStatus.value = DONE
    record($taskActivity, message)
  })
}

function failTask (message) {
  batch(() => {
    $taskStatus.value = ERROR
    record($taskActivity, message)
  })
}

//
// Utility
//

function record ($a, message) {
  $a.value = [...$a.value, { when: new Date(), message }]
}

//
// Exports
//

const actions = { addClient, startTask, completeTask, failTask }
export { $state, actions }
