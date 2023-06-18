import sirv from 'sirv'

import Debug from 'debug'

import { origin as serverOrigin, allowedOrigins, isDev } from './config.mjs'

const logger = Debug('pixprices*')

export const staticFiles = path =>
  sirv(path, {
    dev: isDev,
    gzip: !isDev,
    etag: !isDev
  })

export function cors (req, res, next) {
  const { origin } = req.headers
  if (!origin || origin === serverOrigin) return next()
  if (['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    return next()
  }
  if (!allowedOrigins.includes(origin)) {
    return res.writeHead(403).end()
  }
  res.setHeader('Access-Control-Allow-Origin', origin)
  if (req.method !== 'OPTIONS') return next()
  res
    .writeHead(200, {
      'Access-Control-Allow-Methods': 'GET,POST',
      'Access-Control-Allow-Headers': 'Content-Type,Content-Length'
    })
    .end()
}

export function log (req, res, next) {
  res.once('finish', () => log.writeLine(req, res))
  next()
}

log.writeLine = function (req, res) {
  const { statusCode } = res
  const { method, path } = req
  const s = [method, path, statusCode].filter(Boolean).join(' - ')
  logger(s)
}

export function parseBody (opts = {}) {
  const { json = false, methods = ['POST'] } = opts
  return async (req, res, next) => {
    if (!methods.includes(req.method) || req._bodyParsed) return next()

    req.setEncoding('utf-8')
    let body = ''
    for await (const chunk of req) body += chunk
    if (body) req.body = body
    req._bodyParsed = true

    if (json) {
      req.json = {}
      if (body) {
        try {
          req.json = JSON.parse(body)
        } catch (e) {
          next(e)
        }
      }
    }
    next()
  }
}
