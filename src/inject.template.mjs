;(async () => {
  const server = '{{SERVER_ORIGIN}}'
  const { location } = window
  console.log('PixPrices js injected.')

  const tm = setTimeout(exit, 15 * 60 * 1000)

  const state = await fetch(`${server}/api/status/inject`).then(res =>
    res.json()
  )

  if (location.href !== state.url) {
    console.log(`Not on ${state.url}\nSkipping.`)
    clearTimeout(tm)
    return
  }

  main()

  //
  // Main logic
  //
  async function main () {
    await isDomLoaded()
    const body = document.body.outerHTML
    window.stop()
    await postBody({ body })

    if (state.isTest) {
      console.log('Data posted. Waiting to return.')
      await new Promise(resolve => setTimeout(resolve, 10 * 1000))
    }

    exit()
  }

  //
  // Page loading
  //

  function isDomLoaded () {
    return new Promise(resolve => {
      const okStates = ['interactive', 'complete']
      const ready = () => okStates.includes(document.readyState)
      if (ready()) return resolve()
      document.addEventListener('readystatechange', () => ready() && resolve())
    })
  }

  async function postBody (data) {
    console.log(data)
    const { id } = state
    const url = `${server}/api/task/${id}`
    const body = JSON.stringify(data)
    const method = 'POST'

    const res = await fetch(url, { method, body }).then(res => res.json())
    if (!res.ok) throw new Error('POST failed')
  }

  function exit () {
    location.replace(`${server}/?role=worker`)
  }
})()
