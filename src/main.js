"use strict";

var path = require('path-browserify')
var xhr = require('xhr')
var U2 = require('uglify-js')

var STATUS = {
  LOADING: 1,
  DEFINED: 2,
  COMPILED: 3
}

var modules = window.modules = {}

window.define = function(uri, factory) {
  var module = modules[uri]
  module.status = STATUS.DEFINED
  module.factory = factory
  onModuleDefined(uri)
}

var debug = false

function log() {
  if (debug) {
    console.log.apply(console, arguments)
  }
}

function getFileURI(to, from) {
  if (typeof from === 'undefined') {
    from = location.pathname
  }
  return location.origin + path.resolve(from, to)
}

function getScriptContent(scriptURI, callback) {
  xhr({
    uri: scriptURI,
    headers: {
      "Content-Type": "text/plain"
    }
  }, function(err, resp, body) {
    callback(err, body)
  })
}

function getModuleDependences(scriptContent) {
  var dependences = []
  var walker = new U2.TreeWalker(function(node, descend) {
    if (node instanceof U2.AST_Call && node.expression.name === 'require') {
      var args = node.expression.args || node.args
      var child = args[0]
      if (child instanceof U2.AST_String) {
        dependences.push(child.getValue())
      }
    }
  })
  var ast = U2.parse(scriptContent)
  ast.walk(walker)
  var module = modules[uri]
  module.dependences = {}
  module.waitForDefinedDependences = []
  var dependence;
  var dependenceUri;
  for (var i = 0; i < dependences.length; i ++) {
    dependence = dependences[i]
    if (dependence[0] != '.') {
      // TODO 依赖需要通过 package.json去确认
    } else {
      dependenceUri = path.resolve(module.uri, dependence)
      module.dependences[dependence] = dependenceUri
      module.waitForDefinedDependences.push(dependenceUri)
    }
  }
  module.waitForDefinedDependences = module.waitForDefinedDependences.filter(function(dependenceUri){
    return modules[dependenceUri].status < 2
  })
  return dependences
}

function defineModule(uri) {
  var js = []
  var module = modules[uri]
  js.push('define("')
  js.push(uri)
  js.push('", function(require, exports, module) {\n')
  js.push(module.scriptContent)
  js.push('\n})')
  js = js.join('')
  var script = document.createElement('script')
  script.innerHTML = js
  script.type = 'text/javascript'
  script.async = true
  document.body.appendChild(script)
}

function createModule(uri, selfRun) {
  var module = modules[uri] = {}
  module.uri = uri
  if (selfRun) {
    module.selfRun = selfRun
  }
}

function compileModule(uri) {
  module = modules[uri]
  var __require = function(id) {
    return module.dependences[id].exports
  }
  var __module = {}
  var __exports = __module.exports = {}
  module.factory(__require, __exports, __module)
  module.exports = __module.exports
  module.status = STATUS.COMPILED
}

function loadModule(uri, callback) {
  var module = modules[uri]
  module.status = STATUS.LOADING
  getScriptContent(uri, function(err, body) {
    if (err) {
      throw(err)
    } else {
      module.scriptContent = body
      callback(body)
    }
  })
}

function onModuleDefined(uri) {
  var module;
  for (var moduleUri in modules) {
    if (modules.hasOwnProperty(moduleUri)) {
      module = modules[moduleUri]
      module.waitForDefinedDependences = module.waitForDefinedDependences.fitler(function(dependenceUri) {
        return uri != dependenceUri
      })
      if (module.waitForDefinedDependences.length === 0) {
        if (module.selfRun) {
          compileModule(moduleUri)
        }
      }
    }
  }
  module = modules[uri]
  if (module.waitForDefinedDependences.length == 0 && module.selfRun) {
    compileModule(moduleUri)
  }
}

function loadModuleDependences(uri) {
  module.waitForDefinedDependences.forEach(function(dependenceUri){
    var dependenceModule = modules[dependenceUri]
    if (!dependenceModule) {
      createModule(dependenceUri)
      loadModule(dependenceUri, function() {
        defineModule(dependenceUri)
        getModuleDependences(url)
        loadModuleDependences(dependenceUri)
      })
    }
  })
}

function runModule(uri) {
  createModule(uri, true)
  loadModule(uri, function(scriptContent) {
    defineModule(uri)
    getModuleDependences(url)
    loadModuleDependences(uri)
  })
}

var BL = window.BL = {
  getFileURI: getFileURI,
  getScriptContent: getScriptContent,
  getModuleDependences: getModuleDependences,
  createModule: createModule,
  loadModule: loadModule,
  defineModule: defineModule,
  compileModule: compileModule,
  runModule: runModule
}