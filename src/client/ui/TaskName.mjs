/** @jsx h */
import { h, Fragment } from 'preact'

const STATUS_CLASS = {
  wait: 'text-bg-secondary',
  due: 'text-bg-primary',
  start: 'text-bg-warning',
  done: 'text-bg-success',
  error: 'text-bg-danger'
}

export default function TaskName ({ task }) {
  const cls = STATUS_CLASS[task.status]
  return (
    <Fragment>
      <span class={'badge rounded-pill mx-1 ' + cls}>{task.id}</span>
      <span class='text mx-1'>{task.name}</span>
    </Fragment>
  )
}
