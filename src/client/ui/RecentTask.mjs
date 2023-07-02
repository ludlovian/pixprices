/** @jsx h */
import { h } from 'preact'

import { fmtLongDate } from '../util.mjs'
import TaskName from './TaskName.mjs'

export default function RecentTask ({ task }) {
  return (
    <div class='accordion-item'>
      <TaskHeader task={task} />
      <TaskActivity task={task} />
    </div>
  )
}

function TaskHeader ({ task }) {
  return (
    <h4 class='accordion-header'>
      <button
        class='accordion-button collapsed'
        type='button'
        data-bs-toggle='collapse'
        data-bs-target={`#activityDetail-${task.id}`}
      >
        <TaskName task={task} />
      </button>
    </h4>
  )
}

function TaskActivity ({ task }) {
  const { activity } = task
  if (!activity.length) return null

  return (
    <div
      id={`activityDetail-${task.id}`}
      class='accordion-collapse collapse'
      data-bs-parent='#recentTasks'
    >
      <div class='accordion-body'>
        {task.activity.map(({ when, message }) => (
          <ActivityLine key={when} when={when} message={message} />
        ))}
      </div>
    </div>
  )
}

function ActivityLine ({ when, message }) {
  return (
    <p>
      {fmtLongDate(when)} - {message}
    </p>
  )
}
