import { signal, effect, computed, batch } from '@preact/signals'
import fromNow from 'fromnow'
import { deserialize } from 'pixutil/json'
import Timer from 'timer'

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
  const tm = new Timer({
    every: 10 * 1000,
    fn: () => {
      const dt = $server.value.started
      if (dt) $serverUptime.value = fromNow(dt, { suffix: true })
    }
  }).fire()

  return () => tm.cancel()
})

//
// Countdown timer until due
//

effect(() => {
  if ($task.value.status !== 'wait') return

  const tmDue = new Timer({
    at: $task.value.due,
    fn: () => tmTick.cancel()
  })

  const tmTick = new Timer({
    every: 1000,
    fn: () => {
      $dueSecs.value = Math.floor(tmDue.left() / 1000)
    }
  }).fire()

  return () => tmDue.fire() // cancels both
})

//
// Redirect when due if acting as the worker
//

effect(() => {
  if (!isWorker || !$isDue.value) return
  const { id } = $task.value
  window.location.assign(`/task/${id}`)
})
