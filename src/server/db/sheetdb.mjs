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

import Cache from '../lib/cache.mjs'

const serial = createSerial()
const { assign } = Object

const debug = Debug('pixprices:sheetdb')
const sheetCellsCache = new Cache()

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
  }

  async _loadCells () {
    const n = this.columns.length
    const range = `${this.sheet}!${getRange(2, 1, 9999, n)}`
    let cells = await serial.exec(() =>
      sheets.getRange({
        sheet: this.source,
        range,
        scopes: sheets.scopes.rw,
        ...this.options
      })
    )
    if (!cells) cells = []
    return normaliseArray(removeTrailingEmptyRows(cells), n)
  }

  async load () {
    const cells = await this._loadCells()

    const key = `${this.source}|${this.sheet}`
    sheetCellsCache.set(key, clone(cells))

    this.data = cells
      .map(row => rowToObject(row, this.columns))
      .map(obj => emptyStringToUndef(obj))
      .map(obj => applyTransforms(this.deserialize, obj))
      .map(
        this.row
          ? obj => assign(Object.create(this.row.prototype), obj)
          : obj => obj
      )

    debug('Loaded %d rows from %s', cells.length, this.sheet)
    return this.data
  }

  async save () {
    const key = `${this.source}|${this.sheet}`

    // retrieve the old data, either from cache or by loading
    const oldCells = sheetCellsCache.get(key) ?? (await this._loadCells())

    // convert to POJOs
    // turn POJOs into cells
    const newCells = this.data
      .map(obj => ({ ...obj }))
      .map(obj => applyTransforms(this.serialize, obj))
      .map(obj => undefToEmptyString(obj))
      .map(obj => objectToRow(obj, this.columns))

    // If unchanged, then our work here is done
    if (equal(newCells, oldCells)) {
      debug('Skipped update of %s - no change', this.sheet)
      return
    }
    const nCols = this.columns.length
    const blank = Array.from({ length: nCols }, () => '')
    sheetCellsCache.set(key, clone(newCells))

    while (newCells.length < oldCells.length) {
      newCells.push([...blank])
    }

    if (!newCells.length) return undefined

    const range = `${this.sheet}!${getRange(2, 1, newCells.length, nCols)}`

    await serial.exec(() =>
      sheets.updateRange({
        sheet: this.source,
        range,
        data: newCells,
        scopes: sheets.scopes.rw,
        ...this.options
      })
    )
    debug('Wrote %d rows to %s', this.data.length, this.sheet)
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
