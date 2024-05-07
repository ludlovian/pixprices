import { parse as parseMs } from '@lukeed/ms'
import Debug from '@ludlovian/debug'
import * as sheets from 'googlejs/sheets'
import createSerial from 'pixutil/serial'
import clone from 'pixutil/clone'
import equal from 'pixutil/equal'

import {
  removeTrailingEmptyRows,
  rowToObject,
  objectToRow,
  emptyStringToUndef,
  undefToEmptyString,
  applyTransforms,
  normaliseArray
} from './util.mjs'

const serial = createSerial()
const { assign } = Object

const debug = Debug('pixprices:sheetdb')

export class Table {
  // Each table should be an instance of this

  constructor ({
    source,
    sheet,
    row,
    columns,
    serialize,
    deserialize,
    ...options
  }) {
    assign(this, {
      source,
      sheet,
      row,
      columns,
      serialize,
      deserialize,
      options
    })

    this.data = []
    this._oldData = []
    this.lastLoaded = 0
  }

  isStale (period = parseMs('2m')) {
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
    data = normaliseArray(removeTrailingEmptyRows(data), n)
    this._oldData = clone(data)

    this.data = data
      .map(row => rowToObject(row, this.columns))
      .map(obj => emptyStringToUndef(obj))
      .map(obj => applyTransforms(this.deserialize, obj))
      .map(
        this.row
          ? obj => assign(Object.create(this.row.prototype), obj)
          : obj => obj
      )

    debug('Loaded %d rows from %s', data.length, range)
    return this.data
  }

  async save () {
    // First we make sure we are not stale
    if (this.isStale()) {
      const newData = this.data
      await this.load()
      this.data = newData
    }

    // convert to POJOs
    // turn POJOs into cells
    const data = this.data
      .map(obj => ({ ...obj }))
      .map(obj => applyTransforms(this.serialize, obj))
      .map(obj => undefToEmptyString(obj))
      .map(obj => objectToRow(obj, this.columns))

    // If unchanged, then our work here is done
    if (equal(data, this._oldData)) {
      debug('Skipped update of %s - no change', this.sheet)
      return
    }
    const nCols = this.columns.length
    const blank = Array.from({ length: nCols }, () => '')
    const nRows = this._oldData.length
    this._oldData = clone(data)

    while (data.length < nRows) {
      data.push([...blank])
    }
    this.lastLoaded = Date.now()

    if (!data.length) return undefined

    const range = `${this.sheet}!${getRange(2, 1, data.length, nCols)}`

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
}

function getRange (top, left, height, width) {
  const bottom = top + height - 1
  const right = left + width - 1
  return `${getAddr(top, left)}:${getAddr(bottom, right)}`
}

function getAddr (row, col) {
  return `${sheets.getColumn(col)}${row}`
}
