import config from './config.mjs'
import { signal, computed, effect, batch } from '@preact/signals-core'
import { nextTask } from './task.mjs'

const WAIT = 'wait'
const DUE = 'due'
const START = 'start'
const DONE = 'done'
const ERROR = 'error'

//
// Core data
//

const $taskSpec = signal({})
const $taskStatus = signal(undefined)
const $taskActivity = signal([])
const $recent = signal([])

//
// Derived data
//

const $task = computed(() => ({
  ...$taskSpec.value,
  status: $taskStatus.value,
  activity: $taskActivity.value
}))

const $state = computed(() => ({
  task: $task.value,
  history: $recent.value
}))

const $injectState = computed(() =>
  JSON.stringify({
    origin: config.server.origin,
    url: $task.value.url,
    id: $task.value.id
  })
)

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
    const ms = +$taskSpec.value.due - Date.now()
    const tm = setTimeout(() => ($taskStatus.value = DUE), ms)
    return () => clearTimeout(tm)
  }
})

effect(() => {
  if ($taskStatus.value === START) {
    const ms = config.task.timeout
    const tm = setTimeout(() => failTask('Timed out'), ms)
    return () => clearTimeout(tm)
  }
})

//
// Action functions
//

function addNewTask () {
  batch(() => {
    $recent.value = [$task.value, ...$recent.value]
      .filter(t => t.activity.length)
      .slice(0, config.task.historyLength)

    // load in new task and set to waiting
    $taskSpec.value = nextTask()
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

export { $state, $injectState, startTask, completeTask, failTask }
