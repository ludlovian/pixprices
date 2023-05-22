//
// Utils
//

export function getQuery () {
  return Object.fromEntries(
    window.location.search
      .slice(1)
      .split('&')
      .map(kv => kv.split('='))
  )
}

export function fmtLongDate (d) {
  return [
    d.toLocaleString('default', { weekday: 'short' }),
    d.getDate(),
    d.toLocaleString('default', { month: 'short' }),
    [
      ('00' + d.getHours()).slice(-2),
      ('00' + d.getMinutes()).slice(-2),
      ('00' + d.getSeconds()).slice(-2)
    ].join(':')
  ].join(' ')
}

//
// Duplicated from server
//

const $DATE = '$date$'

export function deserialize (x) {
  if (Array.isArray(x)) return x.map(deserialize)
  if (x === null || typeof x !== 'object') return x
  if ($DATE in x) return new Date(x[$DATE])
  return Object.fromEntries(
    Object.entries(x).map(([k, v]) => [k, deserialize(v)])
  )
}
