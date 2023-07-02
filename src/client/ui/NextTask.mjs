/** @jsx h */
import { h, Fragment } from 'preact'
import TaskName from './TaskName.mjs'
import Countdown from './Countdown.mjs'

export default function NextTask ({ task }) {
  if (!task) return null
  return (
    <Fragment>
      <hr />
      <h4>Next Task</h4>
      <div class='row'>
        <span class='text my-2'>
          <TaskName task={task} />
          <Due task={task} />
        </span>
      </div>
    </Fragment>
  )
}

function Due ({ task }) {
  if (!task.isWaiting) return null
  return (
    <span>
      due in <Countdown target={task.due} />
    </span>
  )
}
