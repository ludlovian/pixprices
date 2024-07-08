import { writeFileSync } from 'node:fs'
import Timer from '@ludlovian/timer'
import Debug from '@ludlovian/debug'
import model from './model/index.mjs'
import config from './config.mjs'

const debug = Debug('pixprices:server')
const XX = false

export function getStateStream (req, res) {
  debug('getStateStream')
  let role
  role = new URL('http://localhost' + req.url).searchParams.get('role')
  role = role === 'worker' ? role : 'watcher'

  res.writeHead(200, {
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream'
  })

  const tmHeartbeat = new Timer({
    ms: config.heartbeatPeriod,
    repeat: true,
    fn: () => res.write(':\n\n')
  })

  const stopListening = model.listen(role, diff => {
    const data = JSON.stringify(diff)
    res.write(`data: ${data}\n\n`)
  })

  req.on('close', stop)

  function stop () {
    tmHeartbeat.cancel()
    stopListening()
  }
}

export function startTask (req, res) {
  const id = req.params.id
  const task = model.schedule.taskById[id]
  const server = config.origin
  if (!task) {
    return res.writeHead(404).end(`No such task: ${id}`)
  }
  const { redirect } = task.startTask() ?? {}
  let url
  if (redirect) {
    const data = `server=${server}&id=${id}`
    url = `${redirect}#${encodeURIComponent(data)}`
  } else {
    url = `${server}?role=worker`
  }

  res
    .writeHead(302, {
      Location: url,
      'Content-Length': 0
    })
    .end()
}

export function postData (req, res) {
  const id = req.params.id
  const task = model.schedule.taskById[id]
  if (!task) {
    return res.writeHead(404).end(`No such task: ${id}`)
  }

  const { job } = task
  const data = req.json
  if (XX) writeFileSync('received.txt', JSON.stringify(data))

  job
    .receiveData(task, data)
    .then(() => res.writeHead(200).end())
    .catch(err => {
      console.error(err)
      res.writeHead(500).end(err.message)
    })
}

export function addAddHoc (req, res) {
  const name = req.params.name
  const job = model.schedule.jobByName[name]
  if (!job) {
    return res.writeHead(404).end(`No such job: ${name}`)
  }
  job.addAdhocTask()
  res.writeHead(200).end()
}
