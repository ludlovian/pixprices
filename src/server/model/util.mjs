import tinydate from 'tinydate'

export function dateFormatter (fmt) {
  return tinydate(fmt, {
    D: d => d.getDate(),
    DDD: d => d.toLocaleString('default', { weekday: 'short' }),
    MMM: d => d.toLocaleString('default', { month: 'short' })
  })
}

export function dateFromDayAndTime (day, tm) {
  const [hh, mm] = tm.split(':').map(s => parseInt(s))
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm)
}

export function advanceOneDay (date) {
  const tomorrow = new Date(date.getTime() + 24 * 60 * 60 * 1000)
  const hhmm = date.toTimeString().slice(0, 5)
  return dateFromDayAndTime(tomorrow, hhmm)
}
