#!/usr/bin/env node
import process from 'node:process'
main()
async function main () {
  const stdin = process.stdin
  stdin.setEncoding('utf8')
  let buff =''
  for await (const chunk of stdin) {
    buff += chunk
  }
  process.stdout.write(buff
    .split('\n')
    .map(line => line.replace(/--.*$/, ''))
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/  +/g, ' ')
  )
}
