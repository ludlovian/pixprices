/** @jsx h */
import { h, Fragment } from 'preact'
import { useEffect } from 'preact/hooks'
import { useSignal } from '@preact/signals'
import fromNow from 'fromnow'
import { parse } from '@lukeed/ms'
import Timer from '@ludlovian/timer'

export default function TimeSince (props) {
  const $out = useSignal(null)
  useEffect(() => startTimer($out, props))
  return <Fragment>{$out}</Fragment>
}

function startTimer ($sig, opts) {
  const { since, freq = '10s', suffix = true } = opts
  const ms = typeof freq === 'string' ? parse(freq) : freq

  const tm = new Timer({ ms, repeat: true, fn: tick })
  tick()

  return () => tm.cancel()

  function tick () {
    $sig.value = fromNow(since, { suffix })
  }
}
