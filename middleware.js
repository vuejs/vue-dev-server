const vueCompiler = require('@vue/component-compiler')
const parseUrl = require('parseurl')
const { transformModuleImports } = require('./transformModuleImports')
const { loadPkg } = require('./loadPkg')
const { readSource } = require('./readSource')

const defaultOptions = {
  cache: true
}

const vueMiddleware = (options = defaultOptions) => {
  let cache
  if (options.cache) {
    const LRU = require('lru-cache')

    cache = new LRU({
      max: 100,
      length: function (n, key) { return n * 2 + key.length },
      maxAge: 1000 * 60 * 60
    })
  }

  const compiler = vueCompiler.createDefaultCompiler()

  function send(res, source, mime) {
    res.setHeader('Content-Type', mime)
    res.end(source)
  }

  function tryCache (key) {
    return cache.get(key)
  }

  function cacheData (key, data) {
    const old = cache.peek(key)

    if (old != data) {
      cache.set(key, data)
      return true
    } else return false
  }

  async function bundleSFC (req) {
    const { filepath, source } = await readSource(req)
    const descriptorResult = compiler.compileToDescriptor(filepath, source)
    return vueCompiler.assemble(compiler, filepath, descriptorResult)
  }

  return async (req, res, next) => {
    if (req.path.endsWith('.vue')) {
      const key = parseUrl(req).pathname
      let out = tryCache(key)
      let cached = false

      if (!out) {
        // Bundle Single-File Component
        out = (await bundleSFC(req)).code
        cacheData(key, out)
        cached = true
      }

      send(res, out, 'application/javascript')

      // Bundle Single-File Component
      out = (await bundleSFC(req)).code
      if (!cached && cacheData(key, out)) {
        console.log(`${key} updated. Please reload the page`)
      }
    } else if (req.path.endsWith('.js')) {
      const key = parseUrl(req).pathname
      let out = tryCache(key)
      let cached = false

      if (!out) {
        // transform import statements
        out = transformModuleImports((await readSource(req)).source)
        cacheData(key, out)
        cached = true
      }

      send(res, out, 'application/javascript')

      // transform import statements
      out = transformModuleImports((await readSource(req)).source)
      if (!cached && cacheData(key, out)) {
        console.log(`${key} updated. Please reload the page`)
      }
    } else if (req.path.startsWith('/__modules/')) {
      const key = parseUrl(req).pathname
      const pkg = req.path.replace(/^\/__modules\//, '')
      let cached = false

      let out = tryCache(key)
      if (!out) {
        out = (await loadPkg(pkg)).toString()
        cacheData(key, out)
        cached = true
      }

      send(res, out, 'application/javascript')

      out = (await loadPkg(pkg)).toString()
      if (!cached && cacheData(key, out)) {
        console.log(`${key} updated. Please reload the page`)
      }
    } else {
      next()
    }
  }
}

exports.vueMiddleware = vueMiddleware