import Database from '@ludlovian/sqlite'
// import { createDB as createSheetDB } from './sheetdb.mjs'
import ddl from './ddl.mjs'
import tempDDL from './temp.mjs'
import auditDDL from './audit.mjs'
import config from '../config.mjs'

// Sheet Database

// const sheetdb = createSheetDB()

// SQLite database

const SCHEMA_VERSIONS = {
  portfolio: 2,
  audit: 1
}

const db = new Database(config.portfolioDB, {
  createDDL: ddl,
  runtimeDDL: tempDDL,
  checkSchema: SCHEMA_VERSIONS.portfolio
})

const auditDB = new Database(config.auditDB, {
  createDDL: auditDDL,
  checkSchema: SCHEMA_VERSIONS.audit
})

auditDB.close()
db.run('attach $auditDB as audit', { auditDB: config.auditDB })
db.trackChanges('Dividend', 'Changes')
db.trackChanges('Metric', 'Changes')
db.trackChanges('Position', 'Changes')
db.trackChanges('Trade', 'Changes')
db.trackChanges('Stock', 'Changes')

// exports

// export { db, sheetdb }
export { db }
