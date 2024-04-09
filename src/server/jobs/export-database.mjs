import Debug from '@ludlovian/debug'
import * as sheets from 'googlejs/sheets'
import dbConfig from '../db/config.mjs'

const debug = Debug('pixprices:export-database')
const { entries } = Object

export default async function exportDatabase (task) {
  let count = 0
  const exp = task.exports
  for (const [table, dests] of entries(exp)) {
    const data = await readSheet(dbConfig.id, table)
    for (const { id, sheet } of dests) {
      await writeSheet(id, sheet, data)
      count++
    }

    debug('%s copied to %d dest(s)', table, dests.length)
  }
  return `${entries(exp).length} tables copied to ${count} dest(s)`
}

async function readSheet (id, sheet) {
  const { getRange, scopes } = sheets
  debug('reading %s from %s', sheet, id)
  const data = await getRange({
    sheet: id,
    range: `${sheet}!A1:ZZ9999`,
    scopes: scopes.rw,
    ...dbConfig.options
  })
  return data ?? []
}

async function writeSheet (id, sheet, data) {
  const { updateRange, scopes, getColumn } = sheets

  const newSize = getSizeOf(data)
  const prevSize = await getSheetSize(id, sheet)
  setSheetSize(id, sheet, newSize)

  data = expandDataTo(data, prevSize)
  const writeSize = getSizeOf(data)

  const range = `${sheet}!A1:${getColumn(writeSize.cols)}${writeSize.rows}`
  await updateRange({
    sheet: id,
    range,
    data,
    scopes: scopes.rw,
    ...dbConfig.options
  })
}

function getSizeOf (data) {
  const rows = data.length
  let cols = 0
  for (let i = 0; i < rows; i++) {
    const n = data[i].length
    if (n > cols) cols = n
  }
  return { rows, cols }
}

function expandDataTo (data, { rows, cols }) {
  data = data.map(row => {
    while (row.length < cols) {
      row.push('')
    }
    return row
  })
  while (data.length < rows) {
    data.push(Array.from({ length: cols }, () => ''))
  }
  return data
}

const sheetSizes = new Map()
async function getSheetSize (id, sheet) {
  const key = `${id}|${sheet}`
  if (sheetSizes.has(key)) return sheetSizes.get(key)

  const data = await readSheet(id, sheet)
  const size = getSizeOf(data)
  sheetSizes.set(key, size)
  return size
}

function setSheetSize (id, sheet, size) {
  const key = `${id}|${sheet}`
  sheetSizes.set(key, size)
}
