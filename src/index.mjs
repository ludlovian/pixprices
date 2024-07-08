import process from 'node:process'
import { server } from './server/index.mjs'
server.start()

process.on('SIGINT', stop).on('SIGTERM', stop)

function stop () {
  process.exit()
}
