import tinydate from 'tinydate'

const $DATE = '$date$'

function dateFormatter (fmt) {
  return tinydate(fmt, {
    D: d => d.getDate(),
    DDD: d => d.toLocaleString('default', { weekday: 'short' }),
    MMM: d => d.toLocaleString('default', { month: 'short' })
  })
}

function serialize (x) {
  if (Array.isArray(x)) return x.map(serialize)
  if (x instanceof Date) return { [$DATE]: x.toISOString() }
  if (x === null || typeof x !== 'object') return x
  return Object.fromEntries(
    Object.entries(x).map(([k, v]) => [k, serialize(v)])
  )
}

function deserialize (x) {
  if (Array.isArray(x)) return x.map(deserialize)
  if (x === null || typeof x !== 'object') return x
  if ($DATE in x) return new Date(x[$DATE])
  return Object.fromEntries(
    Object.entries(x).map(([k, v]) => [k, deserialize(v)])
  )
}
export { dateFormatter, serialize, deserialize }
