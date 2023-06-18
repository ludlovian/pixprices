import { render, h } from 'preact'
import htm from 'htm'

import { Role, ServerStatus, NextTask, RecentTasks } from './ui.mjs'

const html = htm.bind(h)

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
