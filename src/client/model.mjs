import { signal, effect, computed, batch } from './imports.mjs'
import { getQuery, deserialize } from './util.mjs'

//
// The core data
//

const $task = signal({})
const $recent = signal([])
const $dueSecs = signal(0)
const isWorker = getQuery().role === 'worker'

//
// Derived
//

const $fmtSecs = computed(() => fmtDuration($dueSecs.value))
const $isDue = computed(() => $task.value.status === 'due')

//
// Fetch status data
//

const es = new window.EventSource('/status')
es.onmessage = ({ data }) =>
  batch(() => {
    const state = deserialize(JSON.parse(data))
    if (state.task) $task.value = state.task
    if (state.history) $recent.value = state.history
  })

//
// Automatic side-effects
//

//
// Countdown timer until due
//

effect(() => {
  if ($task.value.status !== 'wait') return
  const tm = setInterval(tick, 1000)
  tick()
  return () => clearInterval(tm)

  function tick () {
    const secs = Math.max(0, Math.floor((+$task.value.due - Date.now()) / 1000))
    if (!secs) clearInterval(tm)
    $dueSecs.value = secs
  }
})

//
// Redirect when due if acting as the worker
//

effect(() => {
  if (!isWorker || !$isDue.value) return
  const { id } = $task.value
  window.location.assign(`/task/${id}`)
})

//
// Exports
//
window.pix = { isWorker, $task, $recent, $fmtSecs }
export { isWorker, $task, $recent, $fmtSecs }

// Utility

function fmtDuration (secs) {
  const [mins, ss] = divmod(secs, 60)
  const [hrs, mm] = divmod(mins, 60)

  return [hrs, ('00' + mm).slice(-2), ('00' + ss).slice(-2)]
    .filter(Boolean)
    .join(':')

  function divmod (a, b) {
    const rem = a % b
    return [(a - rem) / b, rem]
  }
}
