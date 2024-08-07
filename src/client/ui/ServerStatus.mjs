/** @jsx h */
import { h, Fragment } from 'preact'
import { useModel } from './use.mjs'
import TimeSince from './TimeSince.mjs'

export default function ServerStatus () {
  const model = useModel()
  if (!model.version) return null
  return (
    <Fragment>
      <p class='text'>
        <span class='h4'>Server Status</span>
        <small class='text mx-2'>version {model.version}</small>
        {model.isDev && (
          <b>DEVELOPMENT</b>
        )}
      </p>
      <div class='row'>
        <div class='text'>
          Started: <TimeSince since={model.started} />
        </div>
        <div class='text'>Workers: {model.$workers}</div>
        <div class='text'>Watchers: {model.$watchers}</div>
      </div>
    </Fragment>
  )
}
