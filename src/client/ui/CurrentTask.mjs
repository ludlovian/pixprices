/** @jsx h */
import { h, Fragment } from 'preact'
import TaskName from './TaskName.mjs'

export default function CurrentTask ({ task }) {
  if (!task) return null
  return (
    <Fragment>
      <hr />
      <h4>Current Task</h4>
      <div class='row'>
        <span class='text my-2'>
          <TaskName task={task} />
        </span>
      </div>
    </Fragment>
  )
}
