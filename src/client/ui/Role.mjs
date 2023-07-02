/** @jsx h */
import { h, Fragment } from 'preact'

export default function Role ({ model }) {
  if (!model.isWorker) return null
  return (
    <Fragment>
      <div class='row'>
        <span class='text fs-3 text-primary'>Worker</span>
      </div>
      <hr />
    </Fragment>
  )
}
