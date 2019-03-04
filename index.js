#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const readFile = require('util').promisify(fs.readFile)
const express = require('express')
const parseUrl = require('parseurl')
const vueCompiler = require('@vue/component-compiler')
const recast = require('recast')
const isPkg = require('validate-npm-package-name')

const app = express()
const root = process.cwd()

function transformModuleImports(code) {
  const ast = recast.parse(code)
  recast.types.visit(ast, {
    visitImportDeclaration(path) {
      const source = path.node.source.value
      if (!/^\.\/?/.test(source) && isPkg(source)) {
        path.node.source = recast.types.builders.literal(`/__modules/${source}`)
      }
      this.traverse(path)
    }
  })
  return recast.print(ast).code
}

async function loadPkg(pkg) {
  if (pkg === 'vue') {
    const dir = path.dirname(require.resolve('vue'))
    const filepath = path.join(dir, 'vue.esm.browser.js')
    return readFile(filepath)
  } else {
    // TODO
    // check if the package has a browser es module that can be used
    // otherwise bundle it with rollup on the fly?
    throw new Error('npm imports support are not ready yet.')
  }
}

const vueMiddleware = root => {
  const compiler = vueCompiler.createDefaultCompiler()

  async function read(req) {
    const { pathname } = parseUrl(req)
    const filepath = path.resolve(root, pathname.replace(/^\//, ''))
    return {
      filepath,
      source: await readFile(filepath, 'utf-8')
    }
  }


  function injectSourceMapsToScript (script) {
    const map = Base64.toBase64(
      JSON.stringify(script.map)
    )

    return {
      ...script,
      code: `//# sourceMappingURL=data:application/json;base64,${map}\n` + script.code
    }
  }

  function injectSourceMapsToStyles (styles) {
    return styles.map(s => {
      const map = Base64.toBase64(
        JSON.stringify(s.map)
      )

      return {
        ...s,
        code: `/*# sourceMappingURL=data:application/json;base64,${map}*/\n` + s.code
      }
    })
  }

  return async (req, res, next) => {
    // TODO caching
    if (req.path.endsWith('.vue')) {
      const { filepath, source } = await read(req)
      const descriptorResult = compiler.compileToDescriptor(filepath, source)
      const assembledResult = vueCompiler.assemble(compiler, filepath, {
        ...descriptorResult,
        styles: injectSourceMapsToStyles(descriptorResult.styles),
        script: injectSourceMapsToScript(descriptorResult.script)
      })
      res.setHeader('Content-Type', 'application/javascript')
      res.end(assembledResult.code)
    } else if (req.path.endsWith('.js')) {
      const { filepath, source } = await read(req)
      // transform import statements
      const transformed = transformModuleImports(source)
      res.setHeader('Content-Type', 'application/javascript')
      res.end(transformed)
    } else if (req.path.startsWith('/__modules/')) {
      const pkg = req.path.replace(/^\/__modules\//, '')
      const source = await loadPkg(pkg)
      res.setHeader('Content-Type', 'application/javascript')
      res.end(source)
    } else {
      next()
    }
  }
}

app.use(vueMiddleware(root))

app.use(express.static(root))

app.listen(3000, () => {
  console.log('server running at http://localhost:3000')
})
