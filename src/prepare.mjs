import { readFileSync, writeFileSync } from 'node:fs'

import config from './server/config.mjs'

const source = 'src/inject.template.mjs'
const target = 'src/client/inject.mjs'

const placeholder = '{{SERVER_ORIGIN}}'
const origin = config.server.origin

let text = readFileSync(source, 'utf-8')
text = text.replace(placeholder, origin)

writeFileSync(target, text)
