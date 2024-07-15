import { writeSheet, getRangeAddress } from '@ludlovian/gsheet'
import Debug from '@ludlovian/debug'
import config from '../config.mjs'
import Job from '../model/job.mjs'
import { db } from '../db/index.mjs'

const debug = Debug('pixprices:export')

export default class ExportData extends Job {
  views

  constructor (schedule, data) {
    super(schedule, data)
    this.views = data.views
  }

  start (task) {
    this.run(task).catch(err => {
      console.error(err)
      task.failTask(err.message)
    })

    return {}
  }

  async run (task) {
    for (const [view, sheet] of Object.entries(this.views)) {
      const data = readView(view)
      if (!data.length) continue
      await writeCellsToSheet(addBlankRows(data), sheet)
      debug('%s exported', view)
    }
    task.completeTask('Views updated')
  }
}

function readView (name) {
  const sql = 'select name from pragma_table_info($name) order by cid'
  const cols = db.all(sql, { name }).map(c => c.name)
  const data = db.all(name)
  return data.map(row => {
    return cols.map(c => row[c] ?? '')
  })
}

function addBlankRows (data, extra = 100) {
  const n = data[0].length
  return [
    ...data,
    ...Array.from({ length: extra }, () => Array.from({ length: n }, () => ''))
  ]
}

async function writeCellsToSheet (data, sheet) {
  const w = data[0].length
  const h = data.length

  const range = `${sheet}!` + getRangeAddress(2, 1, h, w)
  await writeSheet(config.spreadsheetId, range, data)
}
