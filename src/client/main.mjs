import { render, html } from './imports.mjs'
import { MaybeWorker, NextTask, TaskHistory } from './ui.mjs'

render(
  html`
    <div class="container">
      <h3>Pix Prices status</h3>
      <${MaybeWorker} />
      <${NextTask} />
      <hr />
      <${TaskHistory} />
    </div>
  `,
  document.body
)
