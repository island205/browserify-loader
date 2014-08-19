var xhr = require('xhr')
var Module = require('./module')
var url = require('url')

window.define = Module.define
window.define.performance = Module.performance

function loadMainModule(mainScriptUri) {
  var mainModule = new Module(mainScriptUri)
  mainModule.ee.on('loaded', function() {
    Module.performance['bootstrap_end'] = new Date()
    mainModule.run()
  })
  mainModule.load()
}

function bootstrap() {
  Module.performance['bootstrap_start'] = new Date()
  var blScript = document.getElementById('bl-script')
  var packagePath
  var mainScriptPath
  if (blScript) {
    mainScriptPath = blScript.getAttribute('main')
    packagePath = blScript.getAttribute('package')
  } else {
    packagePath = './'
  }
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
        throw (err)
      }
      var pkg = JSON.parse(body)
      mainScriptPath = pkg.main || 'index.js'
      mainScriptPath = url.resolve(packagePath, mainScriptPath)
      loadMainModule(mainScriptPath)
    })
  }
}

bootstrap()