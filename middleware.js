const vueCompiler = require('@vue/component-compiler')
const { transformModuleImports } = require('./transformModuleImports')
const { loadPkg } = require("./loadPkg")
const { readSource } = require('./readSource')

const vueMiddleware = root => {
  const compiler = vueCompiler.createDefaultCompiler()

  function send(res, source, mime) {
    res.setHeader('Content-Type', mime)
    res.end(source)
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
      const { filepath, source } = await readSource(req)
      const descriptorResult = compiler.compileToDescriptor(filepath, source)
      const assembledResult = vueCompiler.assemble(compiler, filepath, {
        ...descriptorResult,
        script: injectSourceMapsToScript(descriptorResult.script),
        styles: injectSourceMapsToStyles(descriptorResult.styles)
      })

      send(res, assembledResult.code, 'application/javascript')
    } else if (req.path.endsWith('.js')) {
      const { filepath, source } = await readSource(req)
      // transform import statements
      const transformed = transformModuleImports(source)

      send(res, transformed, 'application/javascript')
    } else if (req.path.startsWith('/__modules/')) {
      const pkg = req.path.replace(/^\/__modules\//, '')

      send(res, await loadPkg(pkg), 'application/javascript')
    } else {
      next()
    }
  }
}

exports.vueMiddleware = vueMiddleware