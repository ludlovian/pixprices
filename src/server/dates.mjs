const XL_EPOCH_IN_JD = 2_415_018.5
const UNIX_EPOCH_IN_XL = 25_569
const UNIX_EPOCH_IN_JD = UNIX_EPOCH_IN_XL + XL_EPOCH_IN_JD
const MS_PER_DAY = 86_400_000
const MS_PER_MIN = 60_000
const MINS_PER_DAY = 1_440

// Excel <--> JS
//
// Excel / Sheets dates are purely local wall-time.
//
// So local noon, whereever you are in the world will always be 0.5
//
// Julian & JS dates are points-in-time, where 0.5 represents noon GMT
//
// Conversion steps:
//  - start with ms since Unix Epoch for this point in time
//  - convert to number of days since Excel epoch
//  - move the clock-time for local tine
//
function js2xl (d) {
  const minsOffset = d.getTimezoneOffset()
  return +d / MS_PER_DAY + UNIX_EPOCH_IN_XL - minsOffset / MINS_PER_DAY
}

// From serial to JS we reverse it:
// - start with days since XL epoch
// - convert to days since UX epoch
// - convert to ms since UX epoch (but still in local time)
// - make a date, get the TZ offset, and adjust

function xl2js (serial) {
  const ms = (serial - UNIX_EPOCH_IN_XL) * MS_PER_DAY
  const d = new Date(ms)
  return new Date(+d + d.getTimezoneOffset() * MS_PER_MIN)
}

// Julian to JS
//
// Both are point-in-time measures based off Zulu, so the
// conversion is much simpler
//

function jd2js (jd) {
  return new Date((jd - UNIX_EPOCH_IN_JD) * MS_PER_DAY)
}

function js2jd (d) {
  return +d / MS_PER_DAY + UNIX_EPOCH_IN_JD
}

// Excel to Julian
//
// we round-trip via JS

function xl2jd (serial) {
  return js2jd(xl2js(serial))
}

function jd2xl (jd) {
  return js2xl(jd2js(jd))
}

export { xl2js, js2xl, jd2xl, xl2jd, js2jd, jd2js }
