import { h, html } from 'htm/preact'

import { fmtLongDate } from './util.mjs'
import {
  isWorker,
  $server,
  $task,
  $recent,
  $fmtSecs,
  $serverUptime
} from './model.mjs'

export function Role () {
  if (!isWorker) return
  return html`
    <div class="row">
      <span class="text fs-3 text-primary">Worker</span>
    </div>
    <hr />
  `
}

export function ServerStatus () {
  const details = [
    `Started ${$serverUptime.value}`,
    `Workers: ${$server.value.workers}`,
    `Watchers: ${$server.value.watchers}`
  ].map(el => h('div', { class: 'text' }, el))
  return html`
    <h4>Server Status</h4>
    <div class="row">${details}</div>
  `
}

export function NextTask () {
  if (!$task.value.id) return
  return html`
    <h4>Next Task</h4>
    <div class="row">
      <span class="text my-2">
        <${TaskName} ...${$task.value} />
        <span> due in ${$fmtSecs}</span>
      </span>
    </div>
  `
}

const STATUS_CLASS = {
  wait: 'text-bg-secondary',
  due: 'text-bg-primary',
  start: 'text-bg-warning',
  done: 'text-bg-success',
  error: 'text-bg-danger'
}

//
// Task id & name
function TaskName ({ id, status, name }) {
  const a1 = {
    class: ['badge', 'rounded-pill', 'mx-1', STATUS_CLASS[status]].join(' ')
  }
  const a2 = { class: 'text mx-1' }
  return html`
    <span ...${a1}>${id}</span>
    <span ...${a2}>${name}</span>
  `
}

export function RecentTasks () {
  const items = $recent.value.map(t => h(RecentTask, t))
  return html`
    <h4>History</h4>
    <div class="accordion" id="recentTasks">${items}</div>
  `
}

function RecentTask ({ id, name, status, activity }) {
  const attr = {
    class: 'accordion-item',
    key: id
  }
  return html`
    <div ...${attr}>
      <${TaskHeader} ...${{ id, name, status }} />
      <${TaskActivity} ...${{ id, activity }} />
    </div>
  `
}

function TaskHeader ({ id, name, status }) {
  const a1 = { class: 'accordion-header' }
  const a2 = {
    class: 'accordion-button collapsed',
    type: 'button',
    'data-bs-toggle': 'collapse',
    'data-bs-target': `#activityDetail-${id}`
  }
  return html`
    <h4 ...${a1}>
      <button ...${a2}>
        <${TaskName} ...${{ id, status, name }} />
      </button>
    </h4>
  `
}

function TaskActivity ({ id, activity }) {
  const items = activity.map(a => h(ActivityLine, a))
  const a1 = {
    id: `activityDetail-${id}`,
    class: 'accordion-collapse collapse',
    'data-bs-parent': '#recentTasks'
  }
  const a2 = { class: 'accordion-body' }

  return html`
    <div ...${a1}>
      <div ...${a2}>${items}</div>
    </div>
  `
}

function ActivityLine ({ when, message }) {
  return html`
    <p>${fmtLongDate(when)} - ${message}</p>
  `
}
