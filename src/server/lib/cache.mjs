import { parse as parseMs } from '@lukeed/ms'

// Timeout cache
//
export default class Cache extends Map {
  constructor (age = '2m') {
    super()
    this.maxAge = typeof age === 'string' ? parseMs(age) : age
  }

  has (key) {
    const val = super.get(key)
    if (!val) return false
    if (val.expiry < Date.now()) {
      this.delete(key)
      return false
    }
    return true
  }

  get (key) {
    if (!this.has(key)) return undefined
    const data = super.get(key).data
    this.set(key, data)
    return data
  }

  set (key, data) {
    const expiry = Date.now() + this.maxAge
    return super.set(key, { expiry, data })
  }
}
