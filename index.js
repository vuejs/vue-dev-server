#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const readFile = require('util').promisify(fs.readFile)
const express = require('express')
const parseUrl = require('parseurl')
const vueCompiler = require('@vue/component-compiler')
const recast = require('recast')
const isPkg = require('validate-npm-package-name')
const ts = require('typescript')
const tsConfig = require('tsconfig').loadSync(__dirname).config // Find tsconfig.json and load its options. If there isn't any, defaults will be used

const app = express()
const root = process.cwd()

async function compileTypeScript (source, options = {}) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2015, // Build as native ESM by default
      ...options
    }
  })

  result.diagnostics.forEach(diagnostic => { // Process messages from TS compiler
    if (diagnostic.file) {
      let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
      )
      let message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n"
      )
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      )
    } else {
      console.log(
        `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
      )
    }
  })

  return result
}

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

  return async (req, res, next) => {
    // TODO caching
    if (req.path.endsWith('.vue')) {
      const { filepath, source } = await read(req)
      const descriptorResult = compiler.compileToDescriptor(filepath, source)
      let { script } = descriptorResult

      if (source.indexOf('lang="ts"') >= 0 || source.indexOf('lang="typescript"') >= 0) { // Transpile only TS scripts
        const _script = await compileTypeScript(script.code, tsConfig)
        script = {
          code: _script.outputText,
          map: _script.sourceMapText
        }
      }

      const assembledResult = vueCompiler.assemble(compiler, filepath, {
        ...descriptorResult,
        script
      })

      // transform import statements
      const transformed = transformModuleImports(assembledResult.code)

      res.setHeader('Content-Type', 'application/javascript')
      res.end(transformed)
    } else if (req.path.endsWith('.js')) {
      const { filepath, source } = await read(req)
      // transform import statements
      const transformed = transformModuleImports(source)
      res.setHeader('Content-Type', 'application/javascript')
      res.end(transformed)
    } else if (req.path.endsWith('.ts')) {
      const { filepath, source } = await read(req)

      // compile TS => JS
      const result = await compileTypeScript(source, tsConfig)

      // transform import statements
      const transformed = transformModuleImports(result.outputText)

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
