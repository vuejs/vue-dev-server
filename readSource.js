const path = require('path')
const fs = require('fs')
const readFile = require('util').promisify(fs.readFile)
const parseUrl = require('parseurl')
const root = process.cwd()

async function readSource(req) {
  const { pathname } = parseUrl(req)
  const filepath = path.resolve(root, pathname.replace(/^\//, ''))
  return {
    filepath,
    source: await readFile(filepath, 'utf-8')
  }
}

exports.readSource = readSource
