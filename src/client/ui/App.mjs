/** @jsx h */
import { h } from 'preact'

import model from '../model.mjs'
import Role from './Role.mjs'
import ServerStatus from './ServerStatus.mjs'
import Jobs from './Jobs.mjs'
import CurrentTask from './CurrentTask.mjs'
import RecentTasks from './RecentTasks.mjs'

export default function App () {
  if (!model.version) return null
  return (
    <div class='container'>
      <h3>Pix Prices status</h3>
      <Role model={model} />
      <ServerStatus model={model} />
      <Jobs jobs={model.jobs} />
      <CurrentTask task={model.task} />
      <RecentTasks recent={model.recent} />
    </div>
  )
}
