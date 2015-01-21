"use strict";

var xhr = require('xhr')
var parseDependencies = require('searequire')
var url = require('url')
var log = require('./log')
require("6to5/polyfill")

function loadNpmModulePackageJson(searchPath, dep) {
  var pkgUri = `${searchPath}node_modules/${dep}/package.json`
  return new Promise(function(resolve, reject) {
    xhr({
      uri: pkgUri,
      headers: {
        "Content-Type": "application/json"
      }
    }, function(err, resp, body) {
      var pkg
      if (err) {
        reject(err)
      } else {
        try {
          pkg = JSON.parse(body)
          resolve([searchPath, pkg])
        } catch (err) {
          reject(err)
        }
      }
    })
  })
}

function getNpmModuleUri(searchPath, dep, callback) {

  var childModule
  var originDep = dep

  // global/window
  // childModule = window
  // dep = global
  dep = dep.split('/')
  if (dep.length > 1) {
    childModule = dep
    dep = childModule.shift()
    childModule = childModule.join('/')
  } else {
    dep = dep.join('/')
  }

  return new Promise(async function (resovle, reject) {
    var oldSearchPath
    var pkgPath, pkg
    var uri

    searchPath = url.resolve(searchPath, './')
    oldSearchPath = null

    while(oldSearchPath != searchPath) {
      oldSearchPath = searchPath
      log(`searchPath ${searchPath}`)
      try {

        [pkgPath, pkg] = await loadNpmModulePackageJson(searchPath, dep)

        if (childModule) {
          uri = childModule
        } else {
          uri = pkg.main || 'index.js'
        }

        // uri = './node_modules/global/window'
        uri = `./node_modules/${dep}/${uri}`
        uri = url.resolve(searchPath, uri)
        
        resovle(uri)
        break
      } catch(e) {
      }
      searchPath = url.resolve(searchPath, '../')
    }

    reject(`pkg: ${originDep} not Found`)
  })
}

class Module {
  constructor(uri) {
    this.uri = uri
    this.uris = {}
    this.status = Module.STATUS.CREATED
    Module.modules[uri] = this
  }
  static get(uri) {
    var module = this.modules[uri]
    var ext
    if (!module) {
      for (var i = 0; i < Module.extensions.length; i++) {
        ext = Module.extensions[i]
        module = this.modules[`${uri}.${ext}`]
        if (module) {
          break
        }
      }
    }
    if (!module) {
      module = this.modules[uri] = new Module(uri)
    }
    return module
  }

  static define(uri, factory) {
    var module = Module.modules[uri]
    module.factory = factory
    module.status = Module.STATUS.DEFINED
    module.loadDeps()
  }

  static registerExtension(name, compile) {
    Module._extensions[name] = compile
  }

  static resolve(uri) {

    log(`loaded ${uri}`)

    var loadPromise = Module.loadPromises[uri]
    if (loadPromise) {
      loadPromise.resolve()
    } else {
      throw `can't find loadPromise for  ${uri}`
    }
  }

  static reject(uri, err) {

    log(`reject load ${uri}`, err)

    var loadPromise = Module.loadPromises[uri]
    if (loadPromise) {
      loadPromise.reject(err)
    } else {
      throw `can't find loadPromise for ${uri}`
    }
  }

  static performance() {
    var uri, module
    var allCost
    var normalCost = 0
    var compileCost, loadCost
    for (uri in Module.modules) {
      if (Module.modules.hasOwnProperty(uri)) {

        performance.measure(`${uri}_compile`, `${uri}_compile_start`, `${uri}_compile_end`)
        performance.measure(`${uri}_load`, `${uri}_load_start`, `${uri}_load_end`)
        compileCost = performance.getEntriesByName(`${uri}_compile`)[0].duration
        loadCost = performance.getEntriesByName(`${uri}_load`)[0].duration

        normalCost += compileCost + loadCost
      }
    }

    performance.measure('all_cost', 'bootstrap_start', 'bootstrap_end');

    allCost = performance.getEntriesByName('all_cost')[0].duration

    console.log('performance:', allCost / normalCost * 6)
  }

  resolve(dep) {
    var uri = ''
    if (/^\./.test(dep)) {
      uri = url.resolve(this.uri, dep)
      return Promise.resolve(uri)
    } else {
      return getNpmModuleUri(this.uri, dep)
    }
  }

  compile() {
    var module = {}
    var exports = module.exports = {}
    var require = (dep) => {
      var module = Module.get(this.uris[dep])
      return module.exports || module.compile()
    }

    performance.mark(`${this.uri}_compile_start`)

    log(`compile ${this.uri}`)

    this.factory(require, exports, module)

    performance.mark(`${this.uri}_compile_end`)

    return this.exports = module.exports
  }

  load() {
    this.status = Module.STATUS.LOADING
    if (Module.loadPromises[this.uri] && Module.loadPromises[this.uri].promise) {
      return Module.loadPromises[this.uri].promise
    }
    Module.loadPromises[this.uri] = {}
    var loadPromise = Module.loadPromises[this.uri].promise = new Promise((resolve, reject) => {
      
      log(`load ${this.uri}`)

      Module.loadPromises[this.uri].resolve = resolve
      Module.loadPromises[this.uri].reject = reject
      this.loadScript()
        .then(() => this.defineScript())
        .catch((err) => reject(err))
    })
    return loadPromise
  }

  loadScript() {

    performance.mark(`${this.uri}_load_start`)

    var uri = this.uri
    var ext = uri.split('.').pop()
    var extIndex = 0

    function tryExt(uri, callback) {
      xhr({
        uri: uri + '.' + Module.extensions[extIndex],
        headers: {
          "Content-Type": "text/plain"
        }
      }, (err, resp, body) => {
        if (err) {
          if (extIndex >= Module.extensions.length - 1) {
            callback(new Error(`cannot GET ${uri}`))
          } else {
            extIndex++
            tryExt(uri, callback)
          }
        } else {
          callback(err, resp, body)
        }
      })
    }

    return new Promise((resolve, reject) => {
      if (ext == uri || !(Module.extensions.indexOf(ext) > -1)) { // no ext
        tryExt(uri, (err, resp, body) => {
          performance.mark(`${this.uri}_load_end`)
          if (err) {
            reject(err)
          } else {
            this.ext = Module.extensions[extIndex]
            this.script = body
            resolve()
          }
        })
      } else { // has ext
        this.ext = ext
        xhr({
          uri: uri,
          headers: {
            "Content-Type": "text/plain"
          }
        }, (err, resp, body) => {

          performance.mark(`${this.uri}_load_end`)

          if (err) {
            reject(err)
          } else {
            this.script = body
            resolve()
          }
        })
      }
    })
  }

  defineScript() {
    try {
      this.script = Module._extensions[this.ext](this.script)
    } catch (err) {
      Module.reject(this.uri, err)
    }

    var code = this.script
      .split('\n')
      .map(line => `  ${line}`)
      .join('\n')

    var sourceURL =
      this.uri.split('.').pop() != this.ext
      ? `${this.uri}.${this.ext}`
      : this.uri

    code =
      `define("${this.uri}", function(require, exports, module) {\n${code}\n})\n//# sourceURL=${sourceURL}`

    var scriptNode = document.createElement('script')
    scriptNode.innerHTML = code
    scriptNode.type = 'text/javascript'
    document.body.appendChild(scriptNode)
  }

  async loadDeps() {
    var module
    var resolvedDeps = []
    var dep, resolvedDep

    this.getDeps()

    try {
      for (var i = 0; i < this.deps.length; i++) {
        dep = this.deps[i]
        this.uris[dep] =  await this.resolve(dep)
        resolvedDeps.push(this.uris[dep])
      }
      this.deps = resolvedDeps
    } catch (err) {
      return Module.reject(this.uri, err)
    }
    try {
      for (resolvedDep in resolvedDeps) {
        module = Module.get(resolvedDeps[resolvedDep])
        await module.load()
      }
      return Module.resolve(this.uri)
    } catch (err) {
      return Module.reject(this.uri, err)
    }
  }

  getDeps() {
    var deps = parseDependencies(this.script)
    this.deps = deps.map(dep => dep.path)
  }
}

Module.STATUS = {
  CREATED: 0,
  LOADING: 1,
  DEFINED: 2,
  LOADED: 3
}
Module.modules = {}
Module._extensions = {}
Module.loadPromises = {}

module.exports = Module