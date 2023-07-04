/** @jsx h */
import { h, Fragment } from 'preact'
import Countdown from './Countdown.mjs'

export default function Jobs ({ jobs }) {
  if (!jobs) return null
  return (
    <Fragment>
      <hr />
      <h4>Jobs</h4>
      {jobs.map((j, ix) => (
        <Job name={j.name} key={j.job} job={j.job} due={ix ? null : j.due} />
      ))}
    </Fragment>
  )
}

function Job ({ job, name, due }) {
  return (
    <div class='text my-1'>
      <AddNewJob job={job} /> {name}
      {due && (
        <Fragment>
          {' - due in '}
          <Countdown target={due} />
        </Fragment>
      )}
    </div>
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
