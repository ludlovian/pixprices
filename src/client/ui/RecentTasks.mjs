/** @jsx h */
import { h, Fragment } from 'preact'
import sortBy from '@ludlovian/sortby'
import RecentTask from './RecentTask.mjs'

export default function RecentTasks ({ recent }) {
  if (!recent.length) return null
  recent = recent.sort(sortBy('due', 'desc'))

  return (
    <Fragment>
      <hr />
      <h4>History</h4>
      <div class='accordion' id='recentTasks'>
        {recent.map(task => (
          <RecentTask task={task} key={task.id} />
        ))}
      </div>
    </Fragment>
  )
}
