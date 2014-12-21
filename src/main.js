"use strict";

var xhr = require('xhr')
var Module = require('./module')
var url = require('url')
var CoffeeScript = require('coffee-script')
var reactTools = require('react-tools')

Module.registerExtension('js', function(script) {
  return script
})

Module.registerExtension('json', function(script) {
  return 'module.exports = ' + script
})

Module.registerExtension('jsx', function(script) {
  return reactTools.transform(script)
})

Module.registerExtension('coffee', function(script) {
  return CoffeeScript.compile(script)
})

define = window.define = Module.define
define.performance = Module.performance
define.registerExtension = Module.registerExtension

function loadMainModule(mainScriptUri) {
  var mainModule = new Module(mainScriptUri)
  mainModule.load().then(function() {
    mainModule.compile()
    performance.mark('bootstrap_end')
  },function(err) {
    throw(err)
  }).catch(function(err){
    console.error(err)
  })
}

function bootstrap() {
  performance.mark('bootstrap_start')
  var blScript = document.getElementById('bl-script')
  var packagePath
  var mainScriptPath
  var extensions = []
  if (blScript) {
    mainScriptPath = blScript.getAttribute('main')
    packagePath = blScript.getAttribute('package') || './'
    extensions = blScript.getAttribute('extensions')
    if (extensions) {
      extensions = extensions.split(' ')
    }
  } else {
    packagePath = './'
  }
  extensions.unshift('js')
  Module.extensions = extensions
  if (mainScriptPath) {
    mainScriptPath = url.resolve(location.origin, mainScriptPath)
    loadMainModule(mainScriptPath)
  } else {
    packagePath = url.resolve(url.resolve(location.origin, packagePath), './package.json')
    xhr({
      uri: packagePath,
      headers: {
        "Content-Type": "application/json"
      }
    }, function(err, resp, body) {
      if (err) {
        throw err
      }
      var pkg = JSON.parse(body)
      mainScriptPath = pkg.main || 'index.js'
      mainScriptPath = url.resolve(packagePath, mainScriptPath)
      loadMainModule(mainScriptPath)
    })
  }
}

bootstrap()