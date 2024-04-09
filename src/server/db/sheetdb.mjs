import { parse as parseMs } from '@lukeed/ms'
import Debug from '@ludlovian/debug'
import * as sheets from 'googlejs/sheets'
import createSerial from 'pixutil/serial'

import {
  removeTrailingEmptyRows,
  rowToObject,
  objectToRow,
  emptyStringToUndef,
  undefToEmptyString
} from './util.mjs'

const serial = createSerial()
const { assign } = Object

const debug = Debug('pixprices:sheetdb')

export class Table {
  // Each table should be an instance of this

  constructor ({ source, sheet, row, columns, ...options }) {
    assign(this, { source, sheet, row, columns, options })

    this.data = []
    this.rowCount = 0
    this.lastLoaded = 0
  }

  isStale (period = parseMs('15m')) {
    return !this.lastLoaded || this.lastLoaded < Date.now() - period
  }

  async load () {
    const n = this.columns.length
    const range = `${this.sheet}!${getRange(2, 1, 9999, n)}`
    let data = await serial.exec(() =>
      sheets.getRange({
        sheet: this.source,
        range,
        scopes: sheets.scopes.rw,
        ...this.options
      })
    )
    if (!data) data = []

    this.lastLoaded = Date.now()
    data = removeTrailingEmptyRows(data)
    this.rowCount = data.length

    const Factory = this.row
    this.data = data
      .map(row => rowToObject(row, this.columns))
      .map(obj => emptyStringToUndef(obj))
      .map(obj => new Factory(obj))
      .map(row => assign(row, row.deserialize()))

    debug('Loaded %d rows from %s', data.length, range)
    return this.data
  }

  async save () {
    const n = this.columns.length
    const data = this.data
      .map(row => row.serialize())
      .map(obj => undefToEmptyString(obj))
      .map(obj => objectToRow(obj, this.columns))

    const oldRowCount = this.rowCount
    this.rowCount = data.length
    this.lastLoaded = Date.now()

    while (oldRowCount > data.length) {
      data.push(Array.from({ length: n }, () => ''))
    }
    if (!data.length) return undefined

    const range = `${this.sheet}!${getRange(2, 1, data.length, n)}`

    await serial.exec(() =>
      sheets.updateRange({
        sheet: this.source,
        range,
        data,
        scopes: sheets.scopes.rw,
        ...this.options
      })
    )
    debug('Wrote %d rows to %s', data.length, range)
  }
}

// A generic Row, but usually subclasses
export class Row {
  constructor (data = {}) {
    assign(this, data)
  }

  // Called on each row as it is written out to the sheet
  serialize () {
    return this
  }

  // Called on each row as it is read in from the sheet
  deserialize () {
    return this
  }
}

function getRange (top, left, height, width) {
  const bottom = top + height - 1
  const right = left + width - 1
  return `${getAddr(top, left)}:${getAddr(bottom, right)}`
}

function getAddr (row, col) {
  return `${sheets.getColumn(col)}${row}`
}
