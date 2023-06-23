import { render, h } from 'preact'
import '@preact/signals'
import { App } from './ui.mjs'
import model from './model/index.mjs'

model.start()
render(h(App), document.body)
