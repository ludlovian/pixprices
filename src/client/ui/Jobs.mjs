/** @jsx h */
import { h, Fragment } from 'preact'
import sortBy from '@ludlovian/sortby'
import Countdown from './Countdown.mjs'
import TaskName from './TaskName.mjs'

// Jobs is really 'the next task for each job'

export default function Jobs ({ jobs }) {
  if (!jobs) return null
  return (
    <Fragment>
      <hr />
      <h4>Jobs</h4>
      {jobs.sort(sortBy('due')).map((task, ix) => (
        <Task key={task.job} task={task} showStatus={ix === 0} />
      ))}
    </Fragment>
  )
}

function Task ({ task, showStatus }) {
  return (
    <div class='row my-2'>
      <div class='col-auto'>
        <AddNewJob job={task.job} />
      </div>
      <div class='col'>
        <TaskName task={task} />
        {showStatus && <TaskStatus due={task.due} status={task.status} />}
      </div>
    </div>
  )
}

function TaskStatus ({ due, status }) {
  const running = status !== 'wait' && status !== 'due'
  return (
    <Fragment>
      <br />
      <span class='fst-italic'>
        {running ? <TaskRunning /> : <TaskDue due={due} />}
      </span>
    </Fragment>
  )
}

function TaskRunning () {
  return 'Running'
}

function TaskDue ({ due }) {
  return (
    <Fragment>
      {'Due in '}
      <Countdown target={due} />
    </Fragment>
  )
}

function AddNewJob ({ job }) {
  return (
    <button
      type='button'
      class='btn btn-sm btn-outline-primary'
      onclick={() => addJob(job)}
    >
      Add
    </button>
  )
}

async function addJob (job) {
  const url = `/api/job/${job}`
  const opts = { method: 'POST' }
  const res = await window.fetch(url, opts)
  if (!res.ok) throw new Error(res.statusText)
}
