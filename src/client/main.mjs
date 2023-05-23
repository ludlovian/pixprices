import { render, html } from './imports.mjs'
import { Role, ServerStatus, NextTask, RecentTasks } from './ui.mjs'

render(
  html`
    <div class="container">
      <h3>Pix Prices status</h3>
      <${Role} />
      <${ServerStatus} />
      <hr />
      <${NextTask} />
      <hr />
      <${RecentTasks} />
    </div>
  `,
  document.body
)
