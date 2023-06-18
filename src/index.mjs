import { readFileSync, writeFileSync } from 'node:fs'
import { origin, clientPath } from './server/config.mjs'
import { server } from './server/index.mjs'

prepareInject()
server.start()

function prepareInject () {
  const source = 'src/inject.template.mjs'
  const target = clientPath + '/inject.mjs'
  const placeholder = '{{SERVER_ORIGIN}}'
  const text = readFileSync(source, 'utf-8')
  writeFileSync(target, text.replace(placeholder, origin))
}
