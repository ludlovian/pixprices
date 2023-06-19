import { effect } from '@preact/signals-core'

import equal from 'pixutil/equal'
import clone from 'pixutil/clone'
import Bouncer from 'bouncer'

export function subscribe (getCurrent, callback) {
  let prev = {}
  const bouncer = new Bouncer({ after: 100, fn: sendDiff })
  const dispose = effect(() => bouncer.fire(getCurrent()))
  return stop

  function sendDiff () {
    const latest = getCurrent()
    const diff = diffObject(prev, latest)
    if (Object.keys(diff).length) callback(diff)
    prev = clone(latest)
  }

  function stop () {
    dispose()
    bouncer.stop()
  }
}

function diffObject (from, to) {
  const ret = {}
  const fromKeys = new Set(Object.keys(from))

  for (const [key, value] of Object.entries(to)) {
    fromKeys.delete(key)
    if (key in from && equal(from[key], to[key])) continue
    if (isPOJO(value)) {
      ret[key] = diffObject(from[key] || {}, value)
    } else {
      ret[key] = value
    }
  }
  for (const key of fromKeys) ret[key] = null
  return ret
}

function isPOJO (x) {
  return x && typeof x === 'object' && x.constructor === Object
}
