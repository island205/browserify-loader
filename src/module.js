"use strict";

var EventEmitter = require('wolfy87-eventemitter')
var xhr = require('xhr')
var U2 = require('uglify-js')
var url = require('url')
var RSVP = require('rsvp')
var log = require('./log')

function getPackageMainModuleUri(searchPath, dep, callback) {
  log('search', dep, 'in', searchPath)
  var uri = ''
  var pkgUri = url.resolve(searchPath, './')
  var oldSearchPath = searchPath
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
        getPackageMainModuleUri(searchPath, dep, callback)
      } else {
        callback('pkg: ' + dep + ' not Found')
      }
      return
    }
    try {
      pkg = JSON.parse(body)
      uri = pkg.main || 'index.js'
      uri = '/node_modules/' + dep + '/' + uri
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
  this.ee = new EventEmitter
  this.status = Module.STATUS.CREATE
  Module.modules[uri] = this
  this.ee.on('defined', function(){
    this.status = Module.STATUS.DEFINED
    this.loadDeps()
  }.bind(this))
}

Module.STATUS = {
  CREATE: 0,
  DEFINED: 1,
  LOADED: 2
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
  module.ee.trigger('defined')
}

Module.prototype.run = function() {
  this.ee.on('loaded', function() {
    this.compile()
  }.bind(this))
  this.load()
}

Module.prototype.resolve = function(dep) {
  // TODO resovle like global/window
  var uri  = ''
  var promise = new RSVP.Promise(function(resolve, reject) {
    if (/^\./.test(dep)) {
      uri = url.resolve(this.uri, dep)
      if (!/\.js$/.test(uri)) {
        uri = uri + '.js'
      }
      resolve(uri)
    } else {
      getPackageMainModuleUri(this.uri, dep, function(err, uri) {
        if (err) {
          reject(err)
        } else {
          resolve(uri)
        }
      })
    }
  }.bind(this))
  return promise
}

Module.prototype.compile = function() {
  var module = {}
  var exports = module.exports = {}
  var require = function(dep){
    var module = Module.get(this.resolve(dep))
    return module.exports || module.compile()
  }.bind(this)
  this.factory(require, exports, module)
  return this.exports = module.exports
}

Module.prototype.load = function() {
  this.ee.on('scriptLoaded', function(){
    this.defineScript()
  }.bind(this))
  this.loadScript()
}

Module.prototype.loadScript = function() {
  xhr({
    uri: this.uri,
    headers: {
      "Content-Type": "text/plain"
    }
  }, function(err, resp, body) {
    if (err) {
      throw(err)
    } else {
      this.script = body
      this.ee.trigger('scriptLoaded')
    }
  }.bind(this))
}

Module.prototype.defineScript = function() {
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
  this.getDeps()
  var depModules = []
  var module
  var resolveDepPromises = this.deps.map(function(dep) {
    return this.resolve(dep)
  }.bind(this))
  RSVP.all(resolveDepPromises).then(function(deps){
    this.deps = deps
    this.deps.forEach(function(uri) {
      module = Module.get(uri)
      module.ee.on('loaded', this.isLoaded.bind(this))
      depModules.push(module)
    }.bind(this))
    this.depModules = depModules
    this.isLoaded()
    this.depModules.forEach(function(depModule){
      if (depModule.status === Module.STATUS.CREATE) {
        depModule.load()
      }
    }.bind(this))
  }.bind(this)).catch(function(err) {
    log(err)
  })
}

Module.prototype.getDeps = function() {
  var deps = []
  var walker = new U2.TreeWalker(function(node, descend) {
    if (node instanceof U2.AST_Call && node.expression.name === 'require') {
      var args = node.expression.args || node.args
      var child = args[0]
      if (child instanceof U2.AST_String) {
        deps.push(child.getValue())
      }
    }
  })
  var ast = U2.parse(this.script)
  ast.walk(walker)
  this.deps = deps
}

Module.prototype.isLoaded = function() {
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