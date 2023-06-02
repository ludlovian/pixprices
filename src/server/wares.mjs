import { dateFormatter } from './util.mjs'
import config from './config.mjs'

const fmtDate = dateFormatter('{DDD} {D} {MMM} {HH}:{MM}')

//
// Add CORS headers for permitted cross-origin requests
//

export function cors (req, res, next) {
  const { origin } = req.headers
  // not cross-origin
  if (!origin || origin === config.server.origin) return next()
  // GET & HEAD have blanket approval
  if (['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    return next()
  }
  // not a permitted origin
  if (!config.client.allowedOrigins.includes(origin)) {
    return res.writeHead(403).end()
  }
  res.setHeader('Access-Control-Allow-Origin', origin)
  // not a preflight (ie a real POST)
  if (req.method !== 'OPTIONS') return next()
  // Handle preflights ourselves
  res
    .writeHead(200, {
      'Access-Control-Allow-Methods': 'GET,POST',
      'Access-Control-Allow-Headers': 'Content-Type,Content-Length'
    })
    .end()
}

//
// Write server log to console
//

export function log (req, res, next) {
  const when = fmtDate()
  const { method, path } = req

  res.once('finish', () => {
    const { statusCode } = res
    // don't bother logging the boring normal stuff
    if (!config.isTest && isNormal({ statusCode, method })) return
    console.log([when, method, path, statusCode].join(' - '))
  })
  next()

  function isNormal ({ statusCode, method }) {
    return statusCode === 200 && ['GET', 'OPTIONS', 'HEAD'].includes(method)
  }
}

//
// Parse any JSON body
//

export async function parseBody (req, res, next) {
  if (req._body) return next()
  if (req.method !== 'POST') return next()
  let body = ''
  req.setEncoding('utf-8')
  try {
    for await (const chunk of req) {
      body += chunk
    }
    req.body = body
    req.json = JSON.parse(body)
  } catch (err) {
    return next(err)
  }
  req._body = true
  next()
}