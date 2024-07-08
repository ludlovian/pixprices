import process from 'node:process'
import { flattie } from 'flattie'

monitorStream(process.stdin)

async function monitorStream (stream) {
  process.on('SIGINT', stop)

  stream.setEncoding('utf8')
  let buffer = ''
  for await (const chunk of stream) {
    buffer += chunk
    const messages = buffer.split('\n\n')
    buffer = messages.pop()
    for (const message of messages) {
      const lines = message.trim().split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6))
          const entries = Object.entries(flattie(data, '.', true))
            .sort((x, y) => x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)
          const keylen = Math.max(...entries.map(([k]) => k.length))
          for (const [k, v] of entries) {
            console.log(`${k.padEnd(keylen)} ${v}`)
          }
        }
        console.log('')
      }
    }
  }

  function stop () {
    process.nextTick(() => process.exit(0))
  }
}
