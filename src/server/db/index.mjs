import { existsSync } from 'node:fs'
import assert from 'node:assert'
import { join } from 'node:path'
import Database from '@ludlovian/sqlite'

import ddl from './ddl.mjs'
import tempDDL from './temp.mjs'
import auditDDL from './audit.mjs'
import historyDDL from './history.mjs'

import config from '../config.mjs'

const dbDir = config.databaseDir

assert(existsSync(dbDir), 'The database directory does not exist')

const databaseFiles = {
  portfolio: 'portfolio.db',
  audit: 'audit.db',
  history: 'history.db'
}

const schemaVersion = {
  portfolio: 4,
  audit: 4,
  history: 4
}

const db = new Database(join(dbDir, databaseFiles.portfolio), {
  createDDL: ddl,
  runtimeDDL: tempDDL,
  checkSchema: schemaVersion.portfolio
})

const auditDb = new Database(join(dbDir, databaseFiles.audit), {
  createDDL: auditDDL,
  checkSchema: schemaVersion.audit
})

const historyDb = new Database(join(dbDir, databaseFiles.history), {
  createDDL: historyDDL,
  checkSchema: schemaVersion.history
})

db.run('attach $file as audit', { file: join(dbDir, databaseFiles.audit) })

auditDb.close()
historyDb.close()

db.trackChanges('Dividend', { dest: 'Changes', exclude: 'timestamp' })
db.trackChanges('Metric', { dest: 'Changes', exclude: 'timestamp' })
db.trackChanges('Position', { dest: 'Changes', exclude: 'timestamp' })
db.trackChanges('Trade', { dest: 'Changes', exclude: 'timestamp' })
db.trackChanges('Stock', { dest: 'Changes', exclude: 'timestamp' })

// exports

export { db }
