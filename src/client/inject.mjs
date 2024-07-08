;(async () => {
  const { server, id } = getHash()
  if (!server || !id) return
  console.log('PixPrices js injected.')

  setTimeout(exit, 15 * 60 * 1000)

  main()

  //
  // Main logic
  //
  async function main () {
    await isDomLoaded()
    const body = document.body.outerHTML
    window.stop()
    await postBody({ body })
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
    const url = `${server}/api/task/${id}`
    const body = JSON.stringify(data)
    const method = 'POST'

    const res = await fetch(url, { method, body })
    if (!res.ok) throw new Error('POST failed')
  }

  function exit () {
    window.location.replace(`${server}/?role=worker`)
  }

  function getHash () {
    return Object.fromEntries(
      decodeURIComponent((window.location.hash ?? '').slice(1))
        .split('&')
        .map(kv => kv.split('='))
    )
  }
})()
