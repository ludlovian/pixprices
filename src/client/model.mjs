import {
  signal,
  effect,
  computed,
  batch,
  fromNow,
  deserialize
} from './imports.mjs'
import { getQuery, fmtDuration } from './util.mjs'

//
// The core data
//

export const $server = signal({})
export const $task = signal({})
export const $recent = signal([])
const $dueSecs = signal(0)
const { role = 'watcher' } = getQuery()
export const isWorker = role === 'worker'
export const $serverUptime = signal('')

//
// Derived
//

window.pix = { $server, $task, $recent }

export const $fmtSecs = computed(() => fmtDuration($dueSecs.value))
const $isDue = computed(() => $task.value.status === 'due')

//
// Fetch status data
//

const watchItems = [
  ['server', $server],
  ['task', $task],
  ['history', $recent]
]

const es = new window.EventSource(`/status/updates?role=${role}`)
es.onmessage = ({ data }) =>
  batch(() => {
    const state = deserialize(JSON.parse(data))
    for (const [item, $sig] of watchItems) {
      if (state[item]) $sig.value = state[item]
    }
  })

//
// Automatic side-effects
//

//
// Tick down server uptime
//
effect(() => {
  tick()
  const tm = setInterval(tick, 10 * 1000)
  return () => clearInterval(tm)
  function tick () {
    const dt = $server.value.started
    if (!dt) return
    $serverUptime.value = fromNow(dt, { suffix: true })
  }
})

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
