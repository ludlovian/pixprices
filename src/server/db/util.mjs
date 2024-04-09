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
  return columns.map(name => (name ? obj[name] : ''))
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

function objectMapper (fromValue, toValue) {
  const fn = mapper(fromValue, toValue)
  return obj => fromEntries(entries(obj).map(([k, v]) => [k, fn(v)]))
}

function mapper (fromValue, toValue) {
  return x => (x === fromValue ? toValue : x)
}
