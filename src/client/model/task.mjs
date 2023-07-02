import addSignals from '@ludlovian/signal-extra/add-signals'

export default class Task {
  constructor (model, data) {
    this.model = model

    addSignals(this, {
      // from server
      id: 0,
      job: '',
      name: '',
      due: undefined,
      status: '',
      activity: [],

      // local
      isDue: () => this.status === 'due',
      isWaiting: () => this.status === 'wait'
    })

    this._onData(data)
  }

  _onData (data) {
    for (const [key, value] of Object.entries(data)) {
      if (key in this) this[key] = value
    }
  }
}
