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
