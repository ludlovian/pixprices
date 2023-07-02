/** @jsx h */
import { h, Fragment } from 'preact'
import { useEffect } from 'preact/hooks'
import { useSignal } from '@preact/signals'
import fromNow from 'fromnow'
import { parse } from '@lukeed/ms'
import Timer from 'timer'

export default function TimeSince (props) {
  const $out = useSignal(null)
  useEffect(() => startTimer($out, props))
  return <Fragment>{$out}</Fragment>
}

function startTimer ($sig, opts) {
  const { since, freq = '10s', suffix = true } = opts
  const tm = new Timer({
    every: typeof freq === 'string' ? parse(freq) : freq,
    fn: () => ($sig.value = fromNow(since, { suffix }))
  }).fire()
  return () => tm.cancel()
}
