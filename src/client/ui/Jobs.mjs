/** @jsx h */
import { h, Fragment } from 'preact'
import Countdown from './Countdown.mjs'

export default function Jobs ({ jobs }) {
  if (!jobs) return null
  return (
    <Fragment>
      <hr />
      <h4>Jobs</h4>
      {jobs.map((job, ix) => (
        <Job key={job.job} {...job} showStatus={ix === 0} />
      ))}
    </Fragment>
  )
}

function Job ({ job, name, due, status, showStatus }) {
  return (
    <div class='row my-2'>
      <div class='col-auto'>
        <AddNewJob job={job} />
      </div>
      <div class='col'>
        {name}
        {showStatus && <JobStatus due={due} status={status} />}
      </div>
    </div>
  )
}

function JobStatus ({ due, status }) {
  const running = status !== 'wait' && status !== 'due'
  return (
    <Fragment>
      <br />
      <span class='fst-italic'>
        {running ? <JobRunning /> : <JobDue due={due} />}
      </span>
    </Fragment>
  )
}

function JobRunning () {
  return 'Running'
}

function JobDue ({ due }) {
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
  const url = `/api/task/add/${job}`
  const opts = { method: 'POST' }
  const res = await window.fetch(url, opts)
  if (!res.ok) throw new Error(res.statusText)
}
