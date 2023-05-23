import tinydate from 'tinydate'

export function dateFormatter (fmt) {
  return tinydate(fmt, {
    D: d => d.getDate(),
    DDD: d => d.toLocaleString('default', { weekday: 'short' }),
    MMM: d => d.toLocaleString('default', { month: 'short' })
  })
}
