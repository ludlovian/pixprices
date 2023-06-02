import { dateFormatter } from './util.mjs'
const fmtTime = dateFormatter('{HH}:{mm} on {DDD} {D} {MMM}')

export function * getAllTasks (jobs) {
  let id = 0

  const iters = jobs.map(job => makeJobTasks(job))
  const heads = iters.map(iter => iter.next().value)
  while (true) {
    const ix = heads.reduce(
      (e, { due }, ix) => (!e.due || due < e.due ? { due, ix } : e),
      {}
    ).ix
    id++
    yield { id, ...heads[ix] }
    heads[ix] = iters[ix].next().value
  }
}

function * makeJobTasks (_job) {
  const { job, times, ...rest } = _job
  for (const due of getTimeStream(times)) {
    const name = `${job} @ ${fmtTime(due)}`
    yield { job, due, name, ...rest }
  }
}

function * getTimeStream (times) {
  const now = new Date()
  const dates = times.sort().map(tm => dateFromDayAndTime(now, tm))
  while (true) {
    for (const [ix, date] of dates.entries()) {
      if (date > now) yield date
      dates[ix] = advanceOneDay(date)
    }
  }
}

function dateFromDayAndTime (day, tm) {
  const [hh, mm] = tm.split(':').map(s => parseInt(s))
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm)
}

function advanceOneDay (date) {
  const tomorrow = new Date(date.getTime() + 24 * 60 * 60 * 1000)
  const hhmm = date.toTimeString().slice(0, 5)
  return dateFromDayAndTime(tomorrow, hhmm)
}
