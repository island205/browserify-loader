var xhr = require('xhr')
var Module = require('./module')
var url = require('url')

window.define = Module.define

function bootstrap() {
  var blScript = document.getElementById('bl-script')
  var package
  if (blScript && (package = blScript.getAttribute('package'))) {
    package = url.resolve(location.origin, package) + '/package.json'
  }
  else {
    package = location.origin + '/package.json'
  }
  xhr({
    uri: package,
    headers: {
      "Content-Type": "application/json"
    }
  }, function(err, resp, body) {
    if (err) {
      throw (err)
    }
    var pkg = JSON.parse(body)
    var mainScriptPath = pkg.main || 'index.js'
    var mainScriptUri = url.resolve(package, mainScriptPath)
    var mainModule = new Module(mainScriptUri)
    mainModule.ee.on('loaded', function() {
      mainModule.run()
    })
    mainModule.load()
  })
}

bootstrap()