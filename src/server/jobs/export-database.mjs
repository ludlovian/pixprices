import Debug from '@ludlovian/debug'
import * as sheets from 'googlejs/sheets'
import dbConfig from '../db/config.mjs'
import Cache from '../lib/cache.mjs'

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
  const cols = data.reduce((n, row) => Math.max(n, row.length), 0)
  return { rows, cols }
}

function expandDataTo (data, { rows, cols }) {
  const blank = Array.from({ length: cols }, () => '')
  data = data.map(row => [...row, ...blank].slice(0, cols))
  while (data.length < rows) {
    data.push([...blank])
  }
  return data
}

const sheetSizes = new Cache()
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
