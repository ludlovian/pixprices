/** @jsx h */
import { h, Fragment } from 'preact'
import { useEffect } from 'preact/hooks'
import { useSignal } from '@preact/signals'
import { parse } from '@lukeed/ms'
import fromNow from 'fromnow'
import Timer from '@ludlovian/timer'

export default function Countdown (props) {
  const $out = useSignal(null)
  useEffect(() => startTimer($out, props))
  return <Fragment>{$out}</Fragment>
}

function startTimer ($sig, opts) {
  let { target, freq = '1s' } = opts
  target = new Date(target).getTime()
  freq = typeof freq === 'string' ? parse(freq) : freq
  const tm = new Timer({ ms: freq, repeat: true, fn: tick })
  tick()

  return () => tm.cancel()

  function tick () {
    const ms = Math.max(0, target - Date.now())
    $sig.value = ms > 60e3 ? fromNow(target) : fmtDuration(Math.floor(ms / 1e3))
    if (!ms) tm.cancel()
  }
}

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
