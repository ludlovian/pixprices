import Debug from '@ludlovian/debug'
import signalbox from '@ludlovian/signalbox'
import subscribeSignal from '@ludlovian/subscribe-signal'
import Schedule from './schedule.mjs'
import config from '../config.mjs'

export default class Model {
  started = new Date()
  debug = Debug('pixprices:model')
  version = process.env.npm_package_version ?? 'dev'
  schedule = new Schedule(this)
  listeners = {}

  constructor () {
    signalbox(this.listeners, {
      watcher: 0,
      worker: 0
    })
  }

  toJSON () {
    return {
      system: {
        version: this.version,
        started: this.started,
        watchers: this.listeners.watcher,
        workers: this.listeners.worker,
        isDev: config.isDev
      },
      ...this.schedule.toJSON()
    }
  }

  listen (role, callback) {
    const { debug, listeners } = this
    if (role !== 'worker') role = 'watcher'
    listeners[role]++
    debug('New %s listening', role)

    const unsubscribe = subscribeSignal(() => this.toJSON(), callback)

    return stopListening

    function stopListening () {
      debug('%s stopped listening', role)
      unsubscribe()
      listeners[role]--
    }
  }
}
