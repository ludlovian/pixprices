import { createDB as createSheetDB } from './sheetdb.mjs'
// import { openDB, connectToSheetDB } from './sqlite.mjs'

export const sheetdb = createSheetDB()
// export const db = openDB()

// connectToSheetDB(db, sheetdb)
