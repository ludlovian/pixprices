const { fromEntries, entries } = Object

export const undefToEmptyString = objectMapper(undefined, '')
export const emptyStringToUndef = objectMapper('', undefined)

export function rowToObject (row, columns) {
  return fromEntries(
    columns
      .map((name, i) => (name ? [name, row[i]] : undefined))
      .filter(Boolean)
  )
}

export function objectToRow (obj, columns) {
  return columns.map(name => {
    if (!name) return ''
    if (!(name in obj)) return ''
    const v = obj[name]
    if (v == null) return ''
    return v
  })
}

export function removeTrailingEmptyRows (data) {
  while (data.length) {
    const lastRow = data[data.length - 1]
    if (lastRow.length && lastRow.some(x => x !== undefined && x !== '')) {
      return data
    }
    data.pop()
  }
  return data
}

export function applyTransforms (xform, obj) {
  if (!xform) return obj
  return fromEntries(
    entries(obj).map(([k, v]) => {
      const fn = xform[k]
      return [k, typeof fn === 'function' ? fn(v) : v]
    })
  )
}

export function normaliseArray (arr, length) {
  const blank = Array.from({ length }, () => '')
  return arr.map(row => [...row, ...blank].slice(0, length))
}

function objectMapper (fromValue, toValue) {
  const fn = mapper(fromValue, toValue)
  return obj => fromEntries(entries(obj).map(([k, v]) => [k, fn(v)]))
}

function mapper (fromValue, toValue) {
  return x => (x === fromValue ? toValue : x)
}
