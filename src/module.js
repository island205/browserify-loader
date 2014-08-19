"use strict";

var EventEmitter = require('wolfy87-eventemitter')
var xhr = require('xhr')
var parseDependencies = require('searequire')
var url = require('url')
var RSVP = require('rsvp')
var log = require('./log')

function getPackageMainModuleUri(searchPath, dep, callback) {
  log('search', dep, 'in', searchPath)
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
      log('get package main module', uri)
      if (!/\.js$/.test(uri)) {
        uri = uri + '.js'
      }
      callback(null, uri)
    } catch (err) {
      callback(err)
    }
  })
}

function Module(uri) {
  this.uri = uri
  this.uris = {}
  this.performance = {}
  this.ee = new EventEmitter
  this.status = Module.STATUS.CREATED
  Module.modules[uri] = this
  this.ee.on('defined', function(){
    this.performance['define_end'] = new Date
    this.status = Module.STATUS.DEFINED
    this.loadDeps()
  }.bind(this))
}

Module.STATUS = {
  CREATED: 0,
  LOADING: 1,
  DEFINED: 2,
  LOADED: 3
}

Module.modules = {}
Module.performance = {}

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
  module.ee.trigger('defined')
}

Module.performance = function() {
  var uri, module, defineCost, getDepsCost, resolveDepsCost
  var compileCost, loadCost
  var allCost

  var totalCost = 0, extraCost = 0
  for (uri in Module.modules) {
    if (Module.modules.hasOwnProperty(uri)) {
      module = Module.modules[uri]

      defineCost = module.performance['define_end'].getTime() - module.performance['define_start'].getTime()
      console.log(uri, 'define cost:',  defineCost)

      getDepsCost = module.performance['getDeps_end'].getTime() - module.performance['getDeps_start'].getTime()
      console.log(uri, 'getDeps cost:',  getDepsCost)

      resolveDepsCost = module.performance['resolveDeps_end'].getTime() - module.performance['resolveDeps_start'].getTime()
      console.log(uri, 'resolveDeps cost:',  resolveDepsCost)

      compileCost = module.performance['compile_end'].getTime() - module.performance['compile_start'].getTime()
      console.log(uri, 'compile cost:',  compileCost)

      loadCost = module.performance['load_end'].getTime() - module.performance['load_start'].getTime()
      console.log(uri, 'load cost:',  loadCost)

      totalCost += defineCost + getDepsCost + resolveDepsCost + loadCost
      extraCost += defineCost + getDepsCost + resolveDepsCost
    }
  }
  console.log('module performance:', extraCost/totalCost)

  var allCost = Module.performance['bootstrap_start'].getTime() - Module.performance['bootstrap_end'].getTime()

  console.log('all performance:', (allCost - totalCost)/allCost)

}

Module.prototype.run = function() {
  this.compile()
}

Module.prototype.resolve = function(dep) {
  var uri  = ''
  var that = this
  var promise = new RSVP.Promise(function(resolve, reject) {
    if (/^\./.test(dep)) {
      uri = url.resolve(this.uri, dep)
      if (!/\.js$/.test(uri)) {
        uri = uri + '.js'
      }
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
  var require = function(dep){
    var module = Module.get(this.uris[dep])
    return module.exports || module.compile()
  }.bind(this)
  this.performance['compile_start'] = new Date
  this.factory(require, exports, module)
  this.performance['compile_end'] = new Date
  return this.exports = module.exports
}

Module.prototype.load = function() {
  this.status = Module.STATUS.LOADING
  this.ee.on('scriptLoaded', function(){
    this.defineScript()
  }.bind(this))
  this.loadScript()
}

Module.prototype.loadScript = function() {
  this.performance['load_start'] = new Date
  xhr({
    uri: this.uri,
    headers: {
      "Content-Type": "text/plain"
    }
  }, function(err, resp, body) {
    this.performance['load_end'] = new Date
    if (err) {
      throw(err)
    } else {
      this.script = body
      this.ee.trigger('scriptLoaded')
    }
  }.bind(this))
}

Module.prototype.defineScript = function() {
  this.performance['define_start'] = new Date
  var js = []
  js.push('define("')
  js.push(this.uri)
  js.push('", function(require, exports, module) {\n')
  js.push(this.script)
  js.push('\n})')
  js.push('\n//# sourceURL=')
  js.push(this.uri)
  js = js.join('')
  var script = document.createElement('script')
  script.innerHTML = js
  script.type = 'text/javascript'
  document.body.appendChild(script)
}

Module.prototype.loadDeps = function() {
  this.performance['getDeps_start'] = new Date
  this.getDeps()
  this.performance['getDeps_end'] = new Date
  var depModules = []
  var module
  this.performance['resolveDeps_start'] = new Date
  var resolveDepPromises = this.deps.map(function(dep) {
    return this.resolve(dep)
  }.bind(this))
  RSVP.all(resolveDepPromises).then(function(deps){
    this.performance['resolveDeps_end'] = new Date
    this.deps = deps
    this.deps.forEach(function(uri) {
      module = Module.get(uri)
      module.ee.on('loaded', this.isLoaded.bind(this))
      depModules.push(module)
    }.bind(this))
    this.depModules = depModules
    this.isLoaded()
    this.depModules.forEach(function(depModule){
      if (depModule.status < Module.STATUS.LOADING) {
        depModule.load()
      }
    }.bind(this))
  }.bind(this)).catch(function(err) {
    log(err)
  })
}

Module.prototype.getDeps = function() {
  var deps = parseDependencies(this.script)
  this.deps = deps.map(function(dep) {
    return dep.path
  })
}

Module.prototype.isLoaded = function() {
  if (this.status == Module.STATUS.LOADED) {
    return
  }
  var isLoaded = true
  this.depModules.forEach(function(depModule) {
    if (depModule.status < Module.STATUS.LOADED) {
      isLoaded = false
    }
  })
  if (isLoaded) {
    this.status = Module.STATUS.LOADED
    this.ee.trigger('loaded')
  }
}

module.exports = Module