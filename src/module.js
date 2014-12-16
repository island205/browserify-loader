"use strict";

var xhr = require('xhr')
var parseDependencies = require('searequire')
var url = require('url')
var log = require('./log')
var CoffeeScript = require('coffee-script')

function getPackageMainModuleUri(searchPath, dep, callback) {
  var childModule = null
  var uri = ''
  var pkgUri = url.resolve(searchPath, './')
  var oldSearchPath = searchPath
  var originDep = dep
    // global/window
  dep = dep.split('/')
  if (dep.length > 1) {
    childModule = dep
    dep = childModule.shift()
    childModule = childModule.join('/')
  } else {
    dep = dep.join('/')
  }
  pkgUri = pkgUri + 'node_modules/' + dep + '/package.json'
  xhr({
    uri: pkgUri,
    headers: {
      "Content-Type": "application/json"
    }
  }, function(err, resp, body) {
    if (err) {
      searchPath = url.resolve(searchPath, '../')
      if (oldSearchPath != searchPath) {
        getPackageMainModuleUri(searchPath, originDep, callback)
      } else {
        callback('pkg: ' + originDep + ' not Found')
      }
      return
    }
    try {
      var pkg = JSON.parse(body)
      if (childModule) {
        uri = childModule
      } else {
        uri = pkg.main || 'index.js'
      }
      uri = './node_modules/' + dep + '/' + uri
      uri = url.resolve(searchPath, uri)
      // if (!/\.js$/.test(uri)) {
      //   uri = uri + '.js'
      // }
      callback(null, uri)
    } catch (err) {
      callback(err)
    }
  })
}

function Module(uri) {
  this.uri = uri
  this.uris = {}
  this.status = Module.STATUS.CREATED
  Module.modules[uri] = this
}

Module.STATUS = {
  CREATED: 0,
  LOADING: 1,
  DEFINED: 2,
  LOADED: 3
}

Module.modules = {}

Module.get = function(uri) {
  var module = this.modules[uri]
  if (!module) {
    module = this.modules[uri] = new Module(uri)
  }
  return module
}

Module.define = function(uri, factory) {
  var module = Module.modules[uri]
  module.factory = factory
  module.status = Module.STATUS.DEFINED
  module.loadDeps()
}

Module.loadPromises = {}

Module.resolve = function(uri) {
  log('loaded ' + uri)
  var loadPromise = Module.loadPromises[uri]
  if (loadPromise) {
    loadPromise.resolve()
  } else {
    throw "can't find loadPromise for " + uri
  }
}

Module.reject = function(uri, err) {
  log('reject load ' + uri)
  var loadPromise = Module.loadPromises[uri]
  if (loadPromise) {
    loadPromise.reject(err)
  } else {
    throw "can't find loadPromise for " + uri
  }
}

Module.performance = function() {
  var uri, module
  var allCost
  var normalCost = 0
  var compileCost, loadCost
  for (uri in Module.modules) {
    if (Module.modules.hasOwnProperty(uri)) {
      performance.measure(uri + '_compile', uri + '_compile_start', uri + '_compile_end')
      performance.measure(uri + '_load', uri + '_load_start', uri + '_load_end')
      compileCost = performance.getEntriesByName(uri + '_compile')[0].duration
      loadCost = performance.getEntriesByName(uri + '_load')[0].duration
      normalCost += compileCost + loadCost
    }
  }

  performance.measure('all_cost', 'bootstrap_start', 'bootstrap_end');
  allCost = performance.getEntriesByName('all_cost')[0].duration
  console.log('performance:', allCost / normalCost * 6)
}

Module.prototype.run = function() {
  this.compile()
}

Module.prototype.resolve = function(dep) {
  var uri = ''
  var that = this
  var promise = new Promise(function(resolve, reject) {
    if (/^\./.test(dep)) {
      uri = url.resolve(this.uri, dep)
      this.uris[dep] = uri
      resolve(uri)
    } else {
      getPackageMainModuleUri(this.uri, dep, function(err, uri) {
        if (err) {
          reject(err)
        } else {
          that.uris[dep] = uri
          resolve(uri)
        }
      }.bind(this))
    }
  }.bind(this))
  return promise
}

Module.prototype.compile = function() {
  var module = {}
  var exports = module.exports = {}
  var require = function(dep) {
    var module = Module.get(this.uris[dep])
    return module.exports || module.compile()
  }.bind(this)
  performance.mark(this.uri + '_compile_start')
  this.factory(require, exports, module)
  performance.mark(this.uri + '_compile_end')
  return this.exports = module.exports
}

Module.prototype.load = function() {
  this.status = Module.STATUS.LOADING
  if (Module.loadPromises[this.uri] && Module.loadPromises[this.uri].promise) {
    return Module.loadPromises[this.uri].promise
  }
  Module.loadPromises[this.uri] = {}
  var loadPromise = Module.loadPromises[this.uri].promise = new Promise(function(resolve, reject) {
    log('load ' + this.uri)
    Module.loadPromises[this.uri].resolve = resolve
    Module.loadPromises[this.uri].reject = reject
    this.loadScript().then(function() {
      return this.defineScript()
    }.bind(this))
  }.bind(this))
  return loadPromise
}

Module.prototype.loadScript = function() {
  performance.mark(this.uri + '_load_start')
  var uri = this.uri
  var ext = uri.split('.').pop()
  var extIndex = 0

  function tryExt(uri, callback) {
    xhr({
      uri: uri + '.' + Module.extensions[extIndex],
      headers: {
        "Content-Type": "text/plain"
      }
    }, function(err, resp, body) {
      if (err) {
        if (extIndex >= Module.extensions.length - 1) {
          callback(err, resp, body)
        } else {
          extIndex++
          tryExt(uri, callback)
        }
      } else {
        callback(err, resp, body)
      }
    }.bind(this))
  }

  return new Promise(function(resolve, reject) {
    if (ext == uri || Module.extensions.indexOf(ext) == -1) { // no ext
      tryExt(uri, function(err, resp, body) {
        performance.mark(this.uri + '_load_end')
        if (err) {
          reject(err)
        } else {
          this.ext = Module.extensions[extIndex]
          this.script = body
          resolve()
        }
      }.bind(this))
    } else { // has ext
      this.ext = ext
      xhr({
        uri: uri,
        headers: {
          "Content-Type": "text/plain"
        }
      }, function(err, resp, body) {
        performance.mark(this.uri + '_load_end')
        if (err) {
          reject(err)
        } else {
          this.script = body
          resolve()
        }
      }.bind(this))
    }
  }.bind(this))
}

Module.prototype.defineScript = function() {
  if (this.ext == 'coffee') {
    this.script = CoffeeScript.compile(this.script)
  }
  var js = []
  js.push('define("')
  js.push(this.uri)
  js.push('", function(require, exports, module) {\n')
  // indent for source code
  js.push(this.script.split('\n').map(function(line) {
    return '  ' + line
  }).join('\n'))
  js.push('\n})')
  js.push('\n//# sourceURL=')
  if (this.uri.split('.').pop() != this.ext) {
    js.push(this.uri + '.' + this.ext)
  } else {
    js.push(this.uri)
  }
  js = js.join('')
  var script = document.createElement('script')
  script.innerHTML = js
  script.type = 'text/javascript'
  document.body.appendChild(script)
}

Module.prototype.loadDeps = function() {
  this.getDeps()
  var depModules = []
  var module
  var resolveDepPromises = this.deps.map(function(dep) {
    return this.resolve(dep)
  }.bind(this))
  Promise.all(resolveDepPromises).then(function(deps) {
    this.deps = deps
    var loadDepPromises = this.deps.map(function(uri) {
      var module = Module.get(uri)
      return module.load()
    })
    Promise.all(loadDepPromises).then(function() {
      Module.resolve(this.uri)
    }.bind(this)).catch(function(err) {
      Module.reject(this.uri, err)
    }.bind(this))
  }.bind(this)).catch(function(err) {
    Module.reject(this.uri, err)
  }.bind(this))
}

Module.prototype.getDeps = function() {
  var deps = parseDependencies(this.script)
  this.deps = deps.map(function(dep) {
    return dep.path
  })
}

module.exports = Module