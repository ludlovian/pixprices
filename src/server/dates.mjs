const XL_EPOCH_IN_JD = 2_415_018.5
const UNIX_EPOCH_IN_XL = 25_569
const UNIX_EPOCH_IN_JD = UNIX_EPOCH_IN_XL + XL_EPOCH_IN_JD
const MS_PER_DAY = 86_400_000

// Excel <--> JS
//
const xl2js = xl => new Date((xl - UNIX_EPOCH_IN_XL) * MS_PER_DAY)
const js2xl = js => +js / MS_PER_DAY + UNIX_EPOCH_IN_XL

// Julian <--> Excel
const jd2xl = jd => jd - XL_EPOCH_IN_JD
const xl2jd = xl => xl + XL_EPOCH_IN_JD

// JS <--> Julian
const js2jd = js => +js / MS_PER_DAY + UNIX_EPOCH_IN_JD
const jd2js = jd => new Date((jd - UNIX_EPOCH_IN_JD) * MS_PER_DAY)

export { xl2js, js2xl, jd2xl, xl2jd, js2jd, jd2js }
