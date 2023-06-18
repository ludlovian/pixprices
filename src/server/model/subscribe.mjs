import { effect } from '@preact/signals-core'

import equal from 'pixutil/equal'
import clone from 'pixutil/clone'

export function subscribe (getCurrent, callback) {
  let prev = {}
  return effect(sendDiff)

  function sendDiff () {
    const latest = getCurrent()
    const diff = {}
    for (const k in latest) {
      if (!equal(latest[k], prev[k])) diff[k] = clone(latest[k])
    }
    if (Object.keys(diff).length) callback(diff)
    prev = clone(latest)
  }
}
