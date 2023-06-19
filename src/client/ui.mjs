import { h } from 'preact'
import htm from 'htm'

import { fmtLongDate } from './util.mjs'
import model from './model/index.mjs'

const html = htm.bind(h)

export function Role () {
  if (!model.isWorker) return
  return html`
    <div class="row">
      <span class="text fs-3 text-primary">Worker</span>
    </div>
    <hr />
  `
}

export function ServerStatus () {
  const details = [
    `Started ${model.uptime}`,
    `Workers: ${model.workers}`,
    `Watchers: ${model.watchers}`
  ].map(el => h('div', { class: 'text' }, el))
  return html`
    <h4>Server Status</h4>
    <div class="row">${details}</div>
  `
}

export function NextTask () {
  if (!model.task) return
  return html`
    <h4>Next Task</h4>
    <div class="row">
      <span class="text my-2">
        <${TaskName} task=${model.task} />
        <span> due in ${model.task.remaining}</span>
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
function TaskName ({ task }) {
  const cls = STATUS_CLASS[task.status]
  const a1 = { class: 'badge rounded-pill mx-1 ' + cls }
  const a2 = { class: 'text mx-1' }
  return html`
    <span ...${a1}>${task.id}</span>
    <span ...${a2}>${task.name}</span>
  `
}

export function RecentTasks () {
  const items = model.recent.map(task => h(RecentTask, { task }))
  return html`
    <h4>History</h4>
    <div class="accordion" id="recentTasks">${items}</div>
  `
}

function RecentTask ({ task }) {
  const attr = {
    class: 'accordion-item',
    key: task.id
  }
  return html`
    <div ...${attr}>
      <${TaskHeader} task=${task} />
      <${TaskActivity} task=${task} />
    </div>
  `
}

function TaskHeader ({ task }) {
  const a1 = { class: 'accordion-header' }
  const a2 = {
    class: 'accordion-button collapsed',
    type: 'button',
    'data-bs-toggle': 'collapse',
    'data-bs-target': `#activityDetail-${task.id}`
  }
  return html`
    <h4 ...${a1}>
      <button ...${a2}>
        <${TaskName} task=${task} />
      </button>
    </h4>
  `
}

function TaskActivity ({ task }) {
  const items = task.activity.map(a => h(ActivityLine, a))
  const a1 = {
    id: `activityDetail-${task.id}`,
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
