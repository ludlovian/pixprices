import process from 'node:process'
import tinydate from 'tinydate'
import Debug from '@ludlovian/debug'
import Database from '@ludlovian/sqlite'
import config from '../config.mjs'

import createDDL from './sql/ddl.mjs'
import runtimeDDL from './sql/temp.mjs'
import auditDDL from './sql/audit.mjs'

const toYMD = tinydate('{YYYY}-{MM}-{DD}')
const debug = Debug('pixprices:sqlite')

export function connectToSheetDB (sheetdb) {
  const db = openDB()
  for (const [tableName, table] of Object.entries(sheetdb.tables)) {
    const tbName = sqliteTableName(tableName)
    connectSheetTable(db, table, tbName)
  }
}

function openDB () {
  const db = new Database(config.portfolioDB, {
    createDDL,
    runtimeDDL,
    checkSchema: 3
  })
  const auditDB = new Database(config.auditDB, {
    createDDL: auditDDL,
    checkSchema: 2
  })
  auditDB.close()
  db.exec(`attach '${config.auditDB}' as audit`)
  return db
}

function sqliteTableName (s) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/s$/, '')
}

function connectSheetTable (db, table, tbName) {
  const cols = table.columns.filter(col => col.name !== 'updated')
  const tempUpdate = hasTable(db, 'temp', `temp_${tbName}`)
    ? `temp_${tbName}`
    : null
  const auditUpdate = hasTable(db, 'audit', tbName)
    ? `insert into audit.${tbName} select * from audit${tbName}`
    : null
  const saveUpdate = hasTable(db, 'temp', `save${tbName}`)
    ? `save${tbName}`
    : null
  if (!tempUpdate || !saveUpdate) {
    console.error('Could not connect table %s', tbName)
    return
  }

  table.afterSave = rows =>
    db.transaction(() => {
      rows.forEach(row => db.update(tempUpdate, convertRow(row, cols)))
      if (auditUpdate) db.exec(auditUpdate)
      db.update(saveUpdate)
      debug('%s processed %d rows', tbName, rows.length)
    })
}

function convertRow (row, cols) {
  const out = {}
  for (const { name, type } of cols) {
    const val = row[name]
    if (val == null) {
      out[name] = null
    } else if (type === 'number') {
      out[name] = +val
    } else if (type === 'date') {
      out[name] = toYMD(new Date(val))
    } else if (type === 'money') {
      out[name] = Math.round(+val * 100)
    } else {
      out[name] = val
    }
  }
  return out
}

function hasTable (db, schema, name) {
  const res = db.get('pragma_table_list', { schema, name })
  return !!res
}
