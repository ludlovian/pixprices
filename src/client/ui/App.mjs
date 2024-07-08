/** @jsx h */
import { h } from 'preact'

import { useModel } from './use.mjs'
import Role from './Role.mjs'
import ServerStatus from './ServerStatus.mjs'
import Jobs from './Jobs.mjs'
import RecentTasks from './RecentTasks.mjs'

export default function App () {
  const model = useModel()
  if (!model.isReady) return null

  return (
    <div class='container'>
      <h3>Pix Prices status</h3>
      <Role />
      <ServerStatus model={model} />
      <Jobs jobs={model.jobs} />
      <RecentTasks recent={model.recent} />
    </div>
  )
}
