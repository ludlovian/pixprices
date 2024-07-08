/** @jsx h */
import { h, Fragment } from 'preact'
import { useModel } from './use.mjs'

export default function Role () {
  const model = useModel()
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
