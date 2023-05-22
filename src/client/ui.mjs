import { html } from './imports.mjs'
import { fmtLongDate } from './util.mjs'
import { isWorker, $task, $recent, $fmtSecs } from './model.mjs'

export const MaybeWorker = () =>
  isWorker &&
  html`
    <div class="row">
      <span class="text fs-3 text-primary">Worker</span>
    </div>
  `

export const NextTask = () =>
  $task.value.id &&
  html`
    <h4>Next Task</h4>
    <div class="row">
      <span class="text my-2">
        <${TaskName} ...${$task.value} />
        <span> due in ${$fmtSecs}</span>
      </span>
    </div>
  `

const STATUS_CLASS = {
  wait: 'text-bg-secondary',
  due: 'text-bg-primary',
  start: 'text-bg-warning',
  done: 'text-bg-success',
  error: 'text-bg-danger'
}

//
// Task id & name
const TaskName = ({ id, status, name }) => html`
  <span>
    <span class="${`badge rounded-pill ${STATUS_CLASS[status]}`} mx-1">
      ${id}
    </span>
    <span class="text mx-1">
      ${name}
    </span>
  </span>
`

export const TaskHistory = () => html`
  <h4>History</h4>
  <div class="accordion" id="recentTasks">
    ${$recent.value.map(
      t =>
        html`
          <${RecentTask} ...${t} />
        `
    )}
  </div>
`

const RecentTask = ({ id, name, status, activity }) => html`
  <div class="accordion-item" key=${id}>
    <h4 class="accordion-header">
      <button
        class="accordion-button collapsed"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#activityDetail-${id}"
      >
        <${TaskName} ...${{ id, status, name }} />
      </button>
    </h4>
    <div
      id="activityDetail-${id}"
      class="accordion-collapse collapse"
      data-bs-parent="#recentTasks"
    >
      <div class="accordion-body">
        ${activity.map(
          a =>
            html`
              <${Activity} ...${a} />
            `
        )}
      </div>
    </div>
  </div>
`

const Activity = ({ when, message }) => html`
  <p>${fmtLongDate(when)} - ${message}</p>
`
